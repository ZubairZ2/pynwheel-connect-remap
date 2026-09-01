# The whole nightly pipeline behind ONE command, for Heroku Scheduler.
#
#   COMPANY_ID=935 bundle exec rake renu:daily
#   bundle exec rake "renu:daily[935]"          # same thing, argument form
#
# Two steps, in this order and never the other way round:
#
#   1. renu:sync_unit_links  — pull "Apply Now" and "Schedule a Tour" out of the
#      RENU feed onto buttons 1 and 3.
#   2. unit_links:dedupe(apply_labels) — collapse any action advertised in more
#      than one of the three button slots down to the canonical slot.
#
# Order matters: dedupe compares slots that actually hold a URL, so running it
# before the sync would leave a freshly-written button 1 unexamined and the stale
# duplicate in button 2 alive until the next night.
#
# Safe to run every day. Both steps are idempotent — the sync writes only values
# that differ from what is already stored, and dedupe only clears an action that
# genuinely occupies two slots. On a quiet day this writes nothing at all.
#
# Exits non-zero if either step raises, so Heroku Scheduler surfaces the failure
# instead of silently logging it.
namespace :renu do
  desc "Nightly: sync unit links from the RENU feed, then clear duplicate buttons (COMPANY_ID env or arg)"
  task :daily, [:company_id] => :environment do |_task, args|
    company_id = (args[:company_id] || ENV["COMPANY_ID"]).presence
    abort("company_id required — set COMPANY_ID=935 or call rake \"renu:daily[935]\"") if company_id.nil?

    started = Time.current
    puts "[renu:daily] company=#{company_id} started #{started.iso8601}"

    puts "[renu:daily] step 1/2 — sync links from sheet"
    stats = RenuUnitLinksSyncService.new(company_id).perform
    puts "[renu:daily] #{stats.map { |k, v| "#{k}=#{v}" }.join(' ')}"

    puts "[renu:daily] step 2/2 — clear duplicate button actions"
    Rake::Task["unit_links:dedupe"].invoke(company_id, "apply_labels")

    puts "[renu:daily] finished in #{(Time.current - started).round(1)}s"
  rescue StandardError => e
    # Bugsnag is already wired up app-wide; report explicitly because a rake
    # process has no controller/worker middleware to do it for us.
    Bugsnag.notify(e) if defined?(Bugsnag)
    warn "[renu:daily] FAILED #{e.class}: #{e.message}"
    warn e.backtrace.first(10).join("\n")
    exit 1
  end
end
