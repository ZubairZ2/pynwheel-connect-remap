# CLI trigger for SvgBulkOptimizationWorker — the bulk counterpart to the
# per-property "SVG Maps Optimizer" screen. Everything here only *enqueues*;
# the real backup/verify/write work happens in SvgOptimizationWorker, one job
# per map, exactly as it does when a staff member clicks Optimize.
#
#   # dry run first — prints exactly what WOULD be enqueued, writes nothing
#   COMMUNITY_IDS=12,34,56 DRY_RUN=true bundle exec rake svg_optimizer:bulk
#
#   # then commit
#   COMMUNITY_IDS=12,34,56 CONFIRM=yes bundle exec rake svg_optimizer:bulk
#
#   # roll a batch back
#   COMMUNITY_IDS=12,34,56 CONFIRM=yes bundle exec rake svg_optimizer:bulk_revert
#
#   # every eligible property (dry run it first — this is a lot of writes)
#   ALL=true DRY_RUN=true bundle exec rake svg_optimizer:bulk
#
# Options:
#   COMMUNITY_IDS  comma-separated community ids
#   ALL=true       every community in SvgOptimizerTargets.eligible_communities
#   LIMIT=N        cap how many communities are taken (useful with ALL)
#   USER_ID=N      stamp the runs as triggered by this user (for the audit trail)
#   DRY_RUN=true   report the plan and exit without enqueueing
#   CONFIRM=yes    required for a real (non-dry) run — this replaces live files
namespace :svg_optimizer do
  desc "Bulk-optimize the SVG maps of many communities (COMMUNITY_IDS=1,2,3 or ALL=true)"
  task bulk: :environment do
    SvgOptimizerBulkTask.run("optimize")
  end

  desc "Bulk-revert the SVG maps of many communities back to their originals"
  task bulk_revert: :environment do
    SvgOptimizerBulkTask.run("revert")
  end

  module SvgOptimizerBulkTask
    module_function

    def run(action)
      ids = community_ids
      abort("Nothing to do: pass COMMUNITY_IDS=1,2,3 or ALL=true.") if ids.empty?

      puts "#{action.upcase}: #{ids.size} communities"
      report_plan(ids, action)

      if truthy?(ENV["DRY_RUN"])
        puts "\nDRY_RUN — nothing enqueued."
        return
      end

      unless ENV["CONFIRM"].to_s.downcase == "yes"
        abort("\nThis replaces live SVG files. Re-run with CONFIRM=yes once the plan above looks right.")
      end

      SvgBulkOptimizationWorker.perform_async(ids, action, ENV["USER_ID"].presence&.to_i)
      puts "\nEnqueued SvgBulkOptimizationWorker for #{ids.size} communities. Watch Sidekiq + the optimizer screen for progress."
    end

    # Resolves the community id list from either an explicit list or the full
    # eligible set, capped by LIMIT.
    def community_ids
      ids =
        if truthy?(ENV["ALL"])
          SvgOptimizerTargets.eligible_communities.order(:id).pluck(:id)
        else
          ENV["COMMUNITY_IDS"].to_s.split(",").map { |v| v.strip.to_i }.reject(&:zero?)
        end
      ids = ids.first(ENV["LIMIT"].to_i) if ENV["LIMIT"].to_i.positive?
      ids.uniq
    end

    # Runs the same eligibility rules the worker will, so the operator sees the
    # real plan — including which properties will be skipped and why — before
    # committing to any writes.
    def report_plan(ids, action)
      total = 0
      Community.where(id: ids).find_each do |community|
        targets = SvgOptimizerTargets.resolve_targets(community)
        if targets.empty?
          puts "  #{community.id} #{community.name} — skip (no SVG maps)"
          next
        end
        if SvgOptimizerTargets.targets_busy?(community, targets)
          puts "  #{community.id} #{community.name} — skip (run already in progress)"
          next
        end

        latest = SvgOptimizerTargets.latest_by_target(community)
        count =
          if action == "optimize"
            SvgOptimizerTargets.optimizable_targets(community, targets: targets, latest: latest).size
          else
            SvgOptimizerTargets.revertable_runs(community, targets: targets, latest: latest).size
          end

        if count.zero?
          reason = action == "optimize" ? "already optimized" : "nothing to revert"
          puts "  #{community.id} #{community.name} — skip (#{reason})"
        else
          total += count
          puts "  #{community.id} #{community.name} — #{count} map(s)"
        end
      end

      missing = ids - Community.where(id: ids).pluck(:id)
      missing.each { |id| puts "  #{id} — skip (no such community)" }
      verb = action == "optimize" ? "optimized" : "reverted"
      puts "\nTotal maps that would be #{verb}: #{total}"
    end

    def truthy?(val)
      ActiveModel::Type::Boolean.new.cast(val).present?
    end
  end
end
