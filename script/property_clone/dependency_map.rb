# frozen_string_literal: true

# Prints docs/property_clone/DEPENDENCY_MAP.md from PropertyClone::Policy, so
# the document never drifts from the code:
#   bundle exec rails runner script/property_clone/dependency_map.rb > docs/property_clone/DEPENDENCY_MAP.md
policy = PropertyClone::Policy
conn = ActiveRecord::Base.connection

def selection_text(step)
  sel = step.select
  if sel[:id]
    { source: 'the property row', company: "the property's company (communities.company_id)", region: "the property's region (communities.region_id)", group: "the property's portfolio group (communities.community_group_id)" }[sel[:id]]
  elsif sel[:column]
    base = "#{sel[:column]} = #{sel[:value] == :company ? 'source company' : 'source property'}"
    sel[:where] ? "#{base} AND #{sel[:where]}" : base
  elsif sel[:parent]
    "#{sel[:parent]} IN cloned #{sel[:table]}"
  elsif sel[:poly]
    "(#{sel[:poly].join(', ')}) IN cloned #{sel[:tables].join(' / ')}"
  elsif sel[:statuses]
    '(statusable_type, statusable_id) IN every cloned row'
  end
end

puts '# Property clone: dependency map'
puts
puts "Generated from `app/services/property_clone/policy.rb` (policy #{policy::VERSION}) by `script/property_clone/dependency_map.rb`. The property is the primary object; its company is a supporting dependency. Everything below is derived from the models, associations and schema in this repository."
puts
puts '## Categories'
puts
policy::CATEGORIES.each { |k, v| puts "- `#{k}`: #{v}" }
puts
puts '## Tables cloned, in execution order'
puts
puts 'Every step runs after its parents. `remap` lists plain foreign keys rewritten to the clone ids, `polymorphic` the type/id pairs, `self` the columns pointing at the same table (second pass), `sanitized` the columns overwritten on the clone.'
puts
puts '| # | step (table) | category | selection | remap | polymorphic | self | sanitized | note |'
puts '|---|---|---|---|---|---|---|---|---|'
(policy.steps + [policy::STATUSES]).each_with_index do |step, i|
  puts "| #{i + 1} | `#{step.key}` | #{step.category} | #{selection_text(step)} | #{step.remap_columns.map { |c, t| "#{c}→#{t}" }.join(', ')} | #{step.poly_pairs.map { |t, id| "#{t}/#{id}" }.join(', ')} | #{step.self_ref_columns.join(', ')} | #{step.sanitized_columns.keys.join(', ')} | #{step.note.to_s.gsub('|', '/')} |"
end
puts
puts '## Serialized columns that carry record ids (rewritten after the pass)'
puts
puts '| table | column | storage | ids of |'
puts '|---|---|---|---|'
policy::SERIALIZED_ID_COLUMNS.each { |t, c, k, target| puts "| `#{t}` | `#{c}` | #{k} | #{target} |" }
puts
puts '## Per-row overrides'
puts
puts '- `companies.name`, `regions.name`, `community_groups.name`, `communities.name`: the source name plus `' + policy::SUFFIX + '`.'
puts '- `hallway_detection_runs.client_request_id`: a fresh `clone-<uuid>` (unique index).'
puts '- `created_at` / `updated_at` are copied from the source rows (the manifest records when the clone was made).'
puts
puts '## Excluded or disabled'
puts
puts '| table(s) | category | reason |'
puts '|---|---|---|'
policy.exclusions.each { |ex| puts "| `#{ex.table}` | #{ex.category} | #{ex.reason} |" }
puts
puts '## Files (S3)'
puts
puts 'Every CarrierWave uploader stores under `uploads/<model>/<mount>/<record id>/`. By default the clone does NOT copy objects: every cloned row gets `file_source_id` = the source row\'s id and `SharedSourceStorage` makes its uploaders read the source folder, so inventory images, floor plans and the SVG maps are the very same objects. Writing is never shared: a record only deletes objects inside its own id folder, version regeneration is skipped while shared, and the first upload on a cloned record detaches it (its other files are copied into its own folder, then `file_source_id` is cleared). With `COPY_FILES=1` the folders are copied under the clone ids after COMMIT instead, the `*_url` columns (`' + policy::URL_COLUMNS.join('`, `') + '`) rewritten and `file_source_id` cleared. Tables with uploaders among the cloned ones (all carry `file_source_id`):'
puts
(policy.steps).each do |step|
  klass = step.model&.safe_constantize
  next unless klass.respond_to?(:uploaders) && klass.uploaders.any?

  mounts = klass.uploaders.keys.map(&:to_s) & conn.columns(step.table).map(&:name)
  puts "- `#{klass.name}`: #{mounts.join(', ')}" if mounts.any?
end
puts
puts '## Company-level dependencies'
puts
puts 'Cloned: the company row (name suffixed, contact e-mail/phone cleared), `company_settings`, the company-level `credentials` row (secrets and provider identifiers cleared), and only the region and portfolio group the property belongs to (with the group design and its images). Not cloned: the company\'s users and their assignments, its other properties, regions and groups, its PaperTrail history. The clone company therefore shares no mutable row with the source company.'
