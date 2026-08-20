# Bulk counterpart to the per-property UI trigger: hand it a list of community
# ids (or a single id) and it walks them, applying the SAME rules the review
# screen applies, and enqueues one SvgOptimizationWorker per eligible map.
#
#   SvgBulkOptimizationWorker.perform_async([12, 34, 56])          # optimize
#   SvgBulkOptimizationWorker.perform_async(12)                    # one property
#   SvgBulkOptimizationWorker.perform_async(ids, "revert")         # roll back
#
# This worker NEVER touches a map file. All it does is decide what is eligible
# and create `queued` SvgOptimizationRun rows — the existing
# SvgOptimizationWorker still owns the whole backup → verify → write pipeline
# for each individual map, unchanged. That is deliberate: the safety invariant
# (never overwrite a live file without a byte-verified backup of it first)
# stays in exactly one place, and bulk mode gets it for free.
#
# What it enforces per community, via SvgOptimizerTargets (the same code the
# controller uses, not a copy):
#   * skips a property whose maps are mid-flight, rather than racing a run
#     that a staff member started by hand;
#   * optimize skips maps already sitting on our optimized output — they must
#     be reverted first, so a backup never gets overwritten with a
#     non-original;
#   * revert only touches maps whose live file is still the optimized output.
#
# retry: 0 matches SvgOptimizationWorker. A partially-processed batch is safe
# to simply re-run: every guard above is re-evaluated per community, so
# communities already handled are skipped as "nothing to do" rather than
# double-enqueued.
#
# queue "general" is LAST in config/sidekiq.yml's strict priority list, so this
# and everything it enqueues always yield to imports/CRM/deletes.
class SvgBulkOptimizationWorker
  include Sidekiq::Worker
  sidekiq_options queue: "general", retry: 0

  ACTIONS = %w[optimize revert].freeze

  # community_ids — an Array of ids, or a single id.
  # action         — "optimize" (default) or "revert".
  # triggered_by_user_id — stamped onto every run created, so the review screen
  #                        and audit trail attribute the batch to a person.
  def perform(community_ids, action = "optimize", triggered_by_user_id = nil)
    action = action.to_s
    raise ArgumentError, "Unknown action: #{action.inspect}" unless ACTIONS.include?(action)

    ids = Array(community_ids).flatten.map(&:to_i).uniq.reject(&:zero?)
    if ids.empty?
      log("nothing to do — no community ids given")
      return
    end

    stats = { communities: ids.size, processed: 0, skipped: 0, failed: 0, enqueued: 0 }
    log("starting #{action} for #{ids.size} communities")

    ids.each do |community_id|
      # One bad property must not abort the rest of the batch.
      begin
        enqueued = process_community(community_id, action, triggered_by_user_id)
        if enqueued.nil?
          stats[:skipped] += 1
        else
          stats[:processed] += 1
          stats[:enqueued] += enqueued
        end
      rescue StandardError => e
        stats[:failed] += 1
        log("community=#{community_id} FAILED #{e.class}: #{e.message}", level: :error)
      end
    end

    log("finished #{action} — #{stats.map { |k, v| "#{k}=#{v}" }.join(' ')}")
    stats
  end

  private

  # Returns the number of runs enqueued for this community, or nil if the
  # community was skipped entirely (missing, no maps, busy, or nothing left to
  # do). The nil-vs-number distinction is what separates "skipped" from
  # "processed" in the summary.
  def process_community(community_id, action, triggered_by_user_id)
    community = Community.find_by(id: community_id)
    return skip(community_id, "no such community") unless community

    targets = SvgOptimizerTargets.resolve_targets(community)
    return skip(community_id, "no SVG maps") if targets.empty?

    # Don't race a run someone started by hand, or one an earlier community in
    # this same batch left in flight for a shared target.
    if SvgOptimizerTargets.targets_busy?(community, targets)
      return skip(community_id, "a run is already in progress")
    end

    latest = SvgOptimizerTargets.latest_by_target(community)
    specs = build_specs(community, action, targets, latest)
    if specs.empty?
      reason = action == "optimize" ? "already optimized" : "nothing to revert"
      return skip(community_id, reason)
    end

    run_ids = SvgOptimizerTargets.enqueue_runs(community, specs, triggered_by_user_id: triggered_by_user_id)
    log("community=#{community_id} (#{community.name}) enqueued #{run_ids.size} #{action} run(s): #{run_ids.join(', ')}")
    run_ids.size
  end

  def build_specs(community, action, targets, latest)
    case action
    when "optimize"
      SvgOptimizerTargets
        .optimizable_targets(community, targets: targets, latest: latest)
        .map { |t| { target: t, action: "optimize" } }
    when "revert"
      SvgOptimizerTargets
        .revertable_runs(community, targets: targets, latest: latest)
        .map { |src| { target: src.target, action: "revert", reverts_run: src } }
    end
  end

  def skip(community_id, reason)
    log("community=#{community_id} skipped — #{reason}")
    nil
  end

  def log(message, level: :info)
    Rails.logger.public_send(level, "[SvgBulkOptimizationWorker] #{message}")
  end
end
