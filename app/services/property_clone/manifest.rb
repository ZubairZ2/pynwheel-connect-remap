# frozen_string_literal: true

module PropertyClone
  # The audit manifest: what was planned, what was written, the source-to-
  # clone id map, the exclusions, the verification outcomes. JSON under
  # tmp/property_clones/. It names ids, business names and counts only:
  # no credential, address, e-mail or visitor data is ever written to it.
  module Manifest
    module_function

    def dir
      Rails.root.join('tmp', 'property_clones').tap { |d| FileUtils.mkdir_p(d) }
    end

    def build(plan:, mode:, environment:, runner: nil, verification: nil, files: nil, test_admin: nil, status: nil, error: nil)
      {
        'manifest_version' => 1,
        'policy_version' => Policy::VERSION,
        'mode' => mode.to_s,
        'status' => status.to_s,
        'error' => error,
        'started_at' => runner&.started_at&.iso8601,
        'finished_at' => runner&.finished_at&.iso8601,
        'generated_at' => Time.current.iso8601,
        'environment' => environment,
        'suffix' => plan.suffix,
        'options' => plan.options.transform_keys(&:to_s),
        'source' => { 'property_id' => plan.source.id, 'property_name' => plan.source.name, 'company_id' => plan.company.id, 'company_name' => plan.company.name,
                      'region_id' => plan.source.region_id, 'community_group_id' => plan.source.community_group_id, 'data_provider' => plan.source.data_provider,
                      'sibling_property_ids' => plan.sibling_ids },
        'clone' => runner ? { 'property_id' => runner.clone_property_id, 'property_name' => plan.clone_property_name, 'company_id' => runner.clone_company_id, 'company_name' => plan.clone_company_name }
                          : { 'property_name' => plan.clone_property_name, 'company_name' => plan.clone_company_name },
        'steps' => plan.summary_rows.map { |row| step_entry(row, runner) },
        'serialized_columns' => runner ? runner.serialized_results : Policy::SERIALIZED_ID_COLUMNS.map { |t, c, k, target| { 'table' => t, 'column' => c, 'kind' => k, 'target' => target } },
        'self_references' => runner ? runner.self_ref_results : [],
        'excluded' => plan.exclusions,
        'conflicts' => plan.conflicts,
        'notes' => plan.notes,
        'warnings' => runner ? runner.warnings : [],
        'files' => files,
        'verification' => verification,
        'test_admin' => test_admin,
        'baseline' => runner&.baseline&.to_h,
        'id_map' => runner ? runner.id_map.to_h : nil
      }
    end

    def step_entry(row, runner)
      entry = { 'step' => row[:key], 'table' => row[:table], 'category' => row[:category].to_s, 'source_count' => row[:source_count],
                'expected' => row[:expected], 'predicted_skips' => row[:skipped], 'predicted_cleared_references' => row[:cleared],
                'sanitized_columns' => row[:sanitized], 'note' => row[:note] }
      if runner
        result = row[:key] == 'statuses' ? runner.status_result : runner.step_results[row[:key]]
        if result
          entry['cloned'] = result[:cloned]
          entry['skipped'] = result[:skipped]
          entry['cleared_references'] = result[:cleared] || []
        end
      end
      entry
    end

    def write(manifest, name: nil)
      stamp = Time.current.strftime('%Y%m%dT%H%M%S')
      name ||= "#{stamp}-property-#{manifest.dig('source', 'property_id')}-#{manifest['mode']}.json"
      path = dir.join(name)
      File.write(path, JSON.pretty_generate(manifest))
      path
    end

    def read(path)
      JSON.parse(File.read(path))
    end
  end
end
