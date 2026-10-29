# frozen_string_literal: true

# Property-centred cloning (October 28, 2026). See docs/property_clone/RUNBOOK.md.
#
#   rake property_clone:dry_run[1618]          # reads only; prints the plan, writes a dry-run manifest
#   rake property_clone:execute[1618]          # needs PROPERTY_CLONE_EXECUTE=1 CONFIRM_DATABASE=<db> CONFIRM_SOURCE=1618
#                                              # (+ ALLOW_PRODUCTION=1 CONFIRM_PRODUCTION=<db> on a production-like database)
#   rake property_clone:verify[1618]           # MANIFEST=tmp/property_clones/<file>.json re-runs the integrity checks
#   rake property_clone:baseline[1618]         # writes the read-only fingerprint of the source footprint
#   rake property_clone:compare_baseline[1618] # BASELINE=<file> compares the source with a fingerprint taken earlier
#   rake property_clone:test_admin[<clone company id>,<clone property id>]
#                                              # TEST_ADMIN_EMAIL=... [TEST_ADMIN_PASSWORD=... non-production only]
#
#   rake property_clone:share_files[1618]      # MANIFEST=<execute manifest>: point an older clone's rows at the
#                                              # source's upload folders (file_source_id)
#
# Files: by default the clone READS the source records' S3 folders (file_source_id,
# SharedSourceStorage); nothing is copied. COPY_FILES=1 copies every folder under
# the clone ids instead (bucket access required). SKIP_FILES is accepted and means
# the default.
# Options: CLONE_SUFFIX (default " [SCRIPT TESTING]"),
# PROPERTY_CLONE_FAIL_AT=<table>|end (test hook: raise inside the transaction).
namespace :property_clone do
  def property_clone_options
    { suffix: ENV['CLONE_SUFFIX'].presence || PropertyClone::Policy::SUFFIX,
      options: { copy_files: ENV['COPY_FILES'] == '1', fail_at: ENV['PROPERTY_CLONE_FAIL_AT'].presence }.compact }
  end

  def property_clone_source_id(args)
    id = args[:source_id].to_i
    abort 'usage: rake property_clone:<task>[<source property id>]' if id.zero?
    id
  end

  desc 'Dry run: resolve the clone plan for a property and report it (writes nothing to the database)'
  task :dry_run, [:source_id] => :environment do |_t, args|
    source_id = property_clone_source_id(args)
    info = PropertyClone::EnvironmentGuard.describe
    PropertyClone::Report.environment(info)
    opts = property_clone_options
    plan = PropertyClone::Plan.new(source_id, suffix: opts[:suffix], options: opts[:options]).resolve!
    PropertyClone::Report.plan(plan)
    files = { 'mode' => opts[:options][:copy_files] ? 'planned copy (COPY_FILES=1)' : 'shared: the clone reads the source folders (file_source_id)', 'entries' => plan.file_plan.size, 'details' => PropertyClone::FileCopier.plan(plan).map { |e| e.to_h.transform_keys(&:to_s) } }
    manifest = PropertyClone::Manifest.build(plan: plan, mode: :dry_run, environment: info, files: files, status: plan.conflicts.any? ? 'conflicts' : 'ok')
    path = PropertyClone::Manifest.write(manifest)
    puts
    puts "Dry-run manifest: #{path}"
    puts 'No database change was made.'
  end

  desc 'Execute the clone of a property (explicit confirmations required; one transaction; files copied afterwards)'
  task :execute, [:source_id] => :environment do |_t, args|
    source_id = property_clone_source_id(args)
    info = PropertyClone::EnvironmentGuard.require_execute!(source_id)
    PropertyClone::Report.environment(info)
    opts = property_clone_options
    plan = PropertyClone::Plan.new(source_id, suffix: opts[:suffix], options: opts[:options]).resolve!
    PropertyClone::Report.plan(plan)
    abort 'Stopping: the plan has conflicts.' if plan.conflicts.any?

    puts
    puts 'Executing (one transaction)...'
    runner = PropertyClone::Runner.new(plan, options: opts[:options], logger: $stdout)
    begin
      runner.execute!
    rescue StandardError => e
      manifest = PropertyClone::Manifest.build(plan: plan, mode: :execute, environment: info, status: 'rolled_back', error: "#{e.class}: #{e.message}")
      path = PropertyClone::Manifest.write(manifest)
      puts "FAILED: #{e.class}: #{e.message}"
      puts "The transaction was rolled back; nothing was written. Manifest: #{path}"
      raise
    end
    puts "Committed: property #{plan.source.id} -> #{runner.clone_property_id}, company #{plan.company.id} -> #{runner.clone_company_id}"

    verifier = PropertyClone::Verifier.new(plan, runner.id_map, baseline: runner.baseline).run
    PropertyClone::Report.verification(verifier)

    entries = PropertyClone::FileCopier.plan(plan, runner.id_map)
    files = if !opts[:options][:copy_files]
              { 'mode' => 'shared: the clone reads the source folders (file_source_id)', 'entries' => entries.size, 'details' => entries.map { |e| e.to_h.transform_keys(&:to_s) } }
            elsif entries.empty?
              { 'mode' => 'nothing to copy', 'entries' => 0, 'details' => [] }
            else
              puts
              puts "Copying #{entries.size} file folders on S3 bucket #{ENV['S3_BUCKET_NAME'].inspect}..."
              begin
                copier = PropertyClone::FileCopier.new(entries, bucket: ENV.fetch('S3_BUCKET_NAME'), client: Aws::S3::Client.new, plan: plan, logger: $stdout).run!
                copier.summary.merge('mode' => 'copied')
              rescue StandardError => e
                { 'mode' => 'failed', 'error' => "#{e.class}: #{e.message}", 'entries' => entries.size, 'details' => entries.map { |x| x.to_h.transform_keys(&:to_s) } }
              end
            end
    puts "Files: #{files['mode']}#{files['by_status'] ? " #{files['by_status'].inspect}" : ''}"

    manifest = PropertyClone::Manifest.build(plan: plan, mode: :execute, environment: info, runner: runner, verification: verifier.to_a, files: files,
                                             status: verifier.passed? ? 'committed_verified' : 'committed_verification_failed')
    path = PropertyClone::Manifest.write(manifest)
    puts
    puts "Manifest: #{path}"
    abort 'Verification FAILED: review the manifest before using the clone.' unless verifier.passed?
  end

  desc 'Point an existing clone at the source upload folders (MANIFEST=path; for clones made before shared folders)'
  task :share_files, [:source_id] => :environment do |_t, args|
    source_id = property_clone_source_id(args)
    info = PropertyClone::EnvironmentGuard.require_execute!(source_id)
    PropertyClone::Report.environment(info)
    path = ENV['MANIFEST'].presence || abort('MANIFEST=<path to the execute manifest> is required')
    data = PropertyClone::Manifest.read(path)
    abort "the manifest is for property #{data.dig('source', 'property_id')}, not #{source_id}" unless data.dig('source', 'property_id').to_i == source_id
    result = PropertyClone::ShareFiles.call(PropertyClone::IdMap.from_h(data['id_map']), force: ENV['FORCE'] == '1')
    result.tables.each { |table, n| puts format('  %-28s %5d rows', table, n) }
    puts "#{result.rows} rows now read their source record's upload folder."
  end

  desc 'Re-run the integrity checks of a clone from its manifest (MANIFEST=path)'
  task :verify, [:source_id] => :environment do |_t, args|
    source_id = property_clone_source_id(args)
    path = ENV['MANIFEST'].presence || abort('MANIFEST=<path to the execute manifest> is required')
    data = PropertyClone::Manifest.read(path)
    opts = property_clone_options
    plan = PropertyClone::Plan.new(source_id, suffix: data['suffix'] || opts[:suffix], options: { allow_clone_users: true }).resolve!
    id_map = PropertyClone::IdMap.from_h(data['id_map'])
    baseline = data['baseline'] ? PropertyClone::Baseline.from_h(data['baseline']) : nil
    expected = data['steps'].to_h { |s| [s['step'], s['cloned'] || s['expected']] }
    verifier = PropertyClone::Verifier.new(plan, id_map, baseline: baseline, expected_counts: expected).run
    PropertyClone::Report.verification(verifier)
    abort 'Verification FAILED' unless verifier.passed?
  end

  desc 'Write the read-only fingerprint of a property footprint (for later comparison)'
  task :baseline, [:source_id] => :environment do |_t, args|
    source_id = property_clone_source_id(args)
    opts = property_clone_options
    plan = PropertyClone::Plan.new(source_id, suffix: opts[:suffix]).resolve!
    baseline = PropertyClone::Baseline.capture(plan)
    path = PropertyClone::Manifest.dir.join("baseline-property-#{source_id}-#{Time.current.strftime('%Y%m%dT%H%M%S')}.json")
    File.write(path, JSON.pretty_generate(baseline.to_h))
    puts "Baseline (#{baseline.digests.size} digests): #{path}"
  end

  desc 'Compare the source footprint with a fingerprint taken earlier (BASELINE=path)'
  task :compare_baseline, [:source_id] => :environment do |_t, args|
    source_id = property_clone_source_id(args)
    path = ENV['BASELINE'].presence || abort('BASELINE=<path> is required')
    before = PropertyClone::Baseline.from_h(JSON.parse(File.read(path)))
    opts = property_clone_options
    plan = PropertyClone::Plan.new(source_id, suffix: opts[:suffix]).resolve!
    after = PropertyClone::Baseline.capture(plan)
    diffs = before.compare(after)
    if diffs.empty?
      puts "PASS: #{before.digests.size} digests identical (source property #{source_id} and its company unchanged since #{before.captured_at})"
    else
      puts "FAIL: #{diffs.size} digests differ"
      diffs.each { |name, b, a| puts "  #{name}: #{b.inspect} -> #{a.inspect}" }
      abort
    end
  end

  desc 'Bootstrap the test administrator of a cloned company (TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD outside production)'
  task :test_admin, [:company_id, :community_id] => :environment do |_t, args|
    company = Company.find_by(id: args[:company_id].to_i) || abort('unknown company id')
    community = Community.find_by(id: args[:community_id].to_i) || abort('unknown property id')
    info = PropertyClone::EnvironmentGuard.describe
    PropertyClone::Report.environment(info)
    suffix = ENV['CLONE_SUFFIX'].presence || PropertyClone::Policy::SUFFIX
    unless company.name.to_s.end_with?(suffix)
      abort "refusing: company #{company.id} #{company.name.inspect} does not end with #{suffix.inspect} (is this a cloned company?). " \
            'If the clone was made with another CLONE_SUFFIX, pass the same CLONE_SUFFIX to this command.'
    end
    abort "refusing: CONFIRM_DATABASE must equal #{info[:database]}" unless ENV['CONFIRM_DATABASE'] == info[:database]
    abort 'refusing: PROPERTY_CLONE_EXECUTE=1 is required' unless ENV['PROPERTY_CLONE_EXECUTE'] == '1'
    email = ENV['TEST_ADMIN_EMAIL'].presence || abort('TEST_ADMIN_EMAIL is required')
    result = PropertyClone::TestAdmin.call!(company: company, community: community, email: email, password: ENV['TEST_ADMIN_PASSWORD'].presence, production: info[:production_like])
    puts "#{result.status}: #{result.message}"
    puts "user #{result.user_id} role #{result.role.inspect} company #{result.company_id} property #{result.community_id}" if result.status == :created
    puts "credential file (0600): #{result.credential_file}" if result.credential_file
  end
end
