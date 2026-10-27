# frozen_string_literal: true

module PropertyClone
  # Plain-text reports for the rake tasks.
  module Report
    module_function

    def environment(info, out = $stdout)
      out.puts "Database: #{info[:database]} on #{info[:host]} (#{info[:adapter]}, PostgreSQL #{info[:server_version]}), RAILS_ENV=#{info[:rails_env]}, DATABASE_URL #{info[:database_url_set] ? 'set' : 'not set'}"
      out.puts "Production-like: #{info[:production_like] ? 'YES' : 'no'}"
    end

    def plan(plan, out = $stdout)
      out.puts
      out.puts "Source property : #{plan.source.id} #{plan.source.name.inspect} (company #{plan.company.id} #{plan.company.name.inspect}, region #{plan.source.region_id.inspect}, group #{plan.source.community_group_id.inspect}, data_provider #{plan.source.data_provider.inspect})"
      out.puts "Clone property  : #{plan.clone_property_name.inspect}"
      out.puts "Clone company   : #{plan.clone_company_name.inspect}"
      out.puts "Policy          : #{Policy::VERSION}, suffix #{plan.suffix.inspect}"
      out.puts
      out.puts format('%-32s %-12s %7s %8s %7s %7s  %s', 'step', 'category', 'source', 'expected', 'skip', 'clear', 'sanitized columns')
      plan.summary_rows.each do |row|
        next if row[:source_count].zero? && row[:expected].zero?

        out.puts format('%-32s %-12s %7d %8d %7d %7d  %s', row[:key], row[:category], row[:source_count], row[:expected], row[:skipped], row[:cleared], row[:sanitized].first(6).join(',') + (row[:sanitized].size > 6 ? ',...' : ''))
      end
      empty = plan.summary_rows.select { |r| r[:source_count].zero? }.map { |r| r[:key] }
      out.puts "(no source rows: #{empty.join(', ')})" if empty.any?
      out.puts format('%-32s %-12s %7s %8d', 'TOTAL', '', '', plan.total_expected)
      out.puts
      out.puts "Files to copy on S3 (#{plan.file_plan.size}):"
      plan.file_plan.group_by { |f| [f[:model], f[:mount]] }.each { |(model, mount), list| out.puts "  #{model}.#{mount}: #{list.size}" }
      out.puts
      out.puts 'Excluded (not cloned):'
      plan.exclusions.each { |ex| out.puts format('  %-10s %-70s %s', ex[:category], ex[:table], ex[:source_count].nil? ? '' : "#{ex[:source_count]} rows") }
      out.puts
      skips = plan.steps.flat_map { |s| plan.skipped(s.key).map { |k| "#{s.key}##{k[:id]}: #{k[:reason]}" } }
      cleared = plan.steps.flat_map { |s| plan.cleared_references(s.key).map { |c| "#{s.key}: #{c}" } }
      out.puts "Rows that would be skipped (#{skips.size}):"
      skips.first(30).each { |s| out.puts "  #{s}" }
      out.puts '  ...' if skips.size > 30
      out.puts "References that would be cleared (#{cleared.size}):"
      cleared.first(30).each { |c| out.puts "  #{c}" }
      out.puts '  ...' if cleared.size > 30
      out.puts
      out.puts 'Notes:'
      plan.notes.each { |n| out.puts "  - #{n}" }
      out.puts
      if plan.conflicts.any?
        out.puts 'CONFLICTS (the run would stop):'
        plan.conflicts.each { |c| out.puts "  ! #{c}" }
      else
        out.puts 'Conflicts: none'
      end
    end

    def verification(verifier, out = $stdout)
      out.puts
      out.puts 'Verification:'
      verifier.checks.each { |c| out.puts format('  %-8s %-52s %s', c.status, c.name, c.detail.to_s[0, 400]) }
      out.puts "Overall: #{verifier.passed? ? 'PASS' : 'FAIL'}"
    end
  end
end
