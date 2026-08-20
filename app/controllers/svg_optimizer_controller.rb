# SVG Maps Optimizer — internal staff tool that shrinks the embedded raster
# backgrounds inside the live floorplate/sitemap/Beans-background SVGs real
# renters' maps load.
#
# Read-only endpoints (properties, review, analyze, status) never write
# anything: they read the live file storage-agnostically and optimize in
# memory purely to show a before/after breakdown and visual preview. Only
# run_optimize / revert / requeue mutate anything, and they do it by queueing
# an SvgOptimizationWorker, never inline in the web thread.
require "will_paginate/array"

class SvgOptimizerController < ApplicationController
  before_action :require_super_admin

  PER_PAGE = 50

  # A bulk trigger fans out to one SvgOptimizationWorker per MAP, and a property
  # can hold many maps — so the community list is chunked into several
  # SvgBulkOptimizationWorker jobs instead of one job looping thousands of
  # properties, and capped outright. Past the cap the honest answer is "narrow
  # the filter", not "silently enqueue an unbounded batch".
  BULK_CHUNK = 100
  MAX_BULK_COMMUNITIES = 1000

  # Lists every community eligible to be touched (enable_svg_mode AND at least
  # one real SVG — a Floorplate/Sitemap svg_image, or a Beans property's
  # background_svg_image), each with a rolled-up optimization status.
  def properties
    @properties = paginated_property_rows(filtered_communities)

    # The live toolbar re-requests this action on every keystroke; sending back
    # just the results fragment keeps it off the page chrome (layout + sidebar).
    render partial: "results", locals: { properties: @properties }, layout: false if request.xhr?
  end

  # Per-property review page: shows full diagnostic detail + a visual
  # original-vs-optimized preview for every target, all computed in memory
  # (nothing written), so the admin can review before committing the write.
  def review
    @community = Community.find(params[:community_id])
    @targets = resolve_targets(@community)
    @latest_by_target = latest_by_target(@community)
    @busy = targets_busy?(@community, @targets)
    # [type, id] => is this map CURRENTLY optimized (revertable) right now?
    @revertable = @targets.each_with_object({}) do |t, h|
      h[[t.class.name, t.id]] = optimized_now?(@latest_by_target[[t.class.name, t.id]], t)
    end
    @any_revertable = @revertable.values.any?
  rescue ActiveRecord::RecordNotFound
    redirect_to svg_optimizer_properties_path, alert: "Property not found."
  end

  # In-memory analysis of ONE target's current live SVG — same engine and
  # payload as the standalone diagnostic tool (sizes, transfer estimates,
  # notes, per-image breakdown, and both original + optimized SVG text for the
  # visual preview). Reads storage-agnostically; writes nothing.
  def analyze
    community = Community.find(params[:community_id])
    target = find_target(community, params[:target_type], params[:target_id])
    return render_error("Target not found for this property.", status: :not_found) unless target

    latest = latest_by_target(community)[[target.class.name, target.id]]
    optimized_state = optimized_now?(latest, target)

    # Always analyze from the TRUE ORIGINAL so "original" vs "optimized" is
    # unambiguous. If the map is currently optimized, the live file is the
    # optimized output — read the original from its backup instead, so we don't
    # mislabel the optimized file as "original" or re-encode an already-WebP file.
    raw_text = SvgStorageReader.read_url(latest.backup_url) if optimized_state && latest&.backup_url.present?
    raw_text = SvgStorageReader.read_uploader(target.optimizable_svg) if raw_text.blank?
    unless raw_text.present? && raw_text.include?("<svg")
      return render_error("Live file could not be read or isn't a valid SVG.")
    end

    result = SvgBackgroundOptimizerService.call(raw_text)
    render json: {
      success: true,
      target_type: target.class.name,
      target_id: target.id,
      label: helpers.svg_map_label(target),
      live_url: target.optimizable_svg.url,
      optimized_state: optimized_state
    }.merge(result)
  rescue ActiveRecord::RecordNotFound
    render_error("Property not found.", status: :not_found)
  rescue StandardError => e
    Rails.logger.error("[SvgOptimizerController#analyze] #{e.class}: #{e.message}")
    render_error("Could not analyze that file: #{e.message}")
  end

  # Per-property trigger. Creates one queued run per target and enqueues a
  # worker for each. Blocked if any target is already mid-flight, and gated
  # behind an explicit confirmation from the modal.
  def run_optimize
    community = Community.find(params[:community_id])
    targets = requested_targets(community) # one map, or all maps of the property

    return render_error("No SVG maps to optimize.") if targets.empty?
    return render_error("Please confirm you understand this replaces the live SVG files.") unless truthy?(params[:confirmed])

    # Optimize only maps currently on their original/fresh file. A map that's
    # already optimized (live file still our WebP output) is excluded — revert
    # it first. Reverted maps and fresh CMS re-uploads are optimizable again.
    latest = latest_by_target(community)
    targets = targets.reject { |t| optimized_now?(latest[[t.class.name, t.id]], t) }
    return render_error("Already optimized — revert to the original first if you want to re-optimize.") if targets.empty?

    if targets_busy?(community, targets)
      return render_error("An optimization or revert is already in progress for that map. Wait for it to finish.")
    end

    created = enqueue_runs(community, targets.map { |t| { target: t, action: "optimize" } })
    render json: { success: true, enqueued: created.size, run_ids: created }
  rescue ActiveRecord::RecordNotFound
    render_error("Property not found.", status: :not_found)
  end

  # Revert every map on the property that currently has a revertable (optimized)
  # run — the all-level counterpart of the per-row Revert.
  def run_revert_all
    community = Community.find(params[:community_id])
    targets = resolve_targets(community)
    latest = latest_by_target(community)
    sources = targets.filter_map do |t|
      run = latest[[t.class.name, t.id]]
      run if optimized_now?(run, t)
    end

    return render_error("Nothing to revert on this property.") if sources.empty?
    if targets_busy?(community, sources.map(&:target))
      return render_error("A run is already in progress on this property. Wait for it to finish.")
    end

    created = enqueue_runs(community, sources.map { |src| { target: src.target, action: "revert", reverts_run: src } })
    render json: { success: true, enqueued: created.size, run_ids: created }
  rescue ActiveRecord::RecordNotFound
    render_error("Property not found.", status: :not_found)
  end

  # Per-row revert. Reverting run N restores whatever was live before N ran,
  # as a NEW run that backs up the current (optimized) file first.
  def revert
    source = SvgOptimizationRun.find(params[:id])
    community = source.community
    target = source.target

    return render_error("This map can't be reverted — its live file is no longer the optimized version this run produced (it may have been reverted already or re-uploaded in the CMS).") unless optimized_now?(source, target)
    return render_error("A run is already in progress for this file. Wait for it to finish.") if targets_busy?(community, [target])

    run = SvgOptimizationRun.create!(
      community: community,
      target: target,
      action: "revert",
      status: "queued",
      reverts_run: source,
      triggered_by_user_id: current_user.id
    )
    SvgOptimizationWorker.perform_async(run.id)

    render json: { success: true, run_id: run.id }
  rescue ActiveRecord::RecordNotFound
    render_error("Run not found.", status: :not_found)
  end

  # Recovery for a run that's stuck in a non-terminal state (e.g. queued but
  # never picked up because Sidekiq was down, or running when a worker died).
  # Marks the stuck attempt failed so it stops blocking the property, then
  # enqueues a fresh run of the same action for the same target.
  def requeue
    stuck = SvgOptimizationRun.find(params[:id])
    return render_error("This run already finished — nothing to re-run.") unless stuck.in_progress?

    was = stuck.status
    new_run = nil
    ActiveRecord::Base.transaction do
      stuck.update!(
        status: "failed",
        error_message: "Manually re-run by #{current_user.email} (was stuck in '#{was}').",
        finished_at: Time.current
      )
      new_run = SvgOptimizationRun.create!(
        community: stuck.community,
        target: stuck.target,
        action: stuck.action,
        status: "queued",
        reverts_run: stuck.reverts_run,
        triggered_by_user_id: current_user.id
      )
    end
    SvgOptimizationWorker.perform_async(new_run.id)

    render json: { success: true, run_id: new_run.id }
  rescue ActiveRecord::RecordNotFound
    render_error("Run not found.", status: :not_found)
  end

  # Polling endpoint that drives the live "Optimizing… 4/7" UI.
  def status
    community = Community.find(params[:community_id])
    targets = resolve_targets(community)
    latest = latest_by_target(community)

    render json: {
      success: true,
      rollup: property_rollup(community, targets, latest),
      any_revertable: targets.any? { |t| optimized_now?(latest[[t.class.name, t.id]], t) },
      targets: targets.map { |t| target_status_json(t, latest[[t.class.name, t.id]]) }
    }
  rescue ActiveRecord::RecordNotFound
    render_error("Property not found.", status: :not_found)
  end

  # Bulk trigger for MANY properties at once — the list-page counterpart of the
  # per-property review screen. Takes either an explicit set of checked
  # community ids, or select_all_matching + the current filter params (so
  # "filter by partner, select all, optimize" works across every page of
  # results, not just the 50 rows on screen).
  #
  # Like the per-property trigger this only enqueues: SvgBulkOptimizationWorker
  # re-applies every eligibility guard per community, then SvgOptimizationWorker
  # does the actual backup/verify/write for each map. Nothing here writes.
  def bulk
    bulk_action = params[:bulk_action].presence || "optimize"
    unless SvgBulkOptimizationWorker::ACTIONS.include?(bulk_action)
      return render_error("Unknown bulk action.")
    end
    unless truthy?(params[:confirmed])
      return render_error("Please confirm you understand this replaces the live SVG files.")
    end

    ids = bulk_community_ids
    if ids.empty?
      return render_error(
        truthy?(params[:select_all_matching]) ? "No eligible properties match the current filters." : "No properties selected."
      )
    end
    if ids.size > MAX_BULK_COMMUNITIES
      return render_error("That's #{ids.size} properties — more than the #{MAX_BULK_COMMUNITIES} limit for one batch. Narrow the filter and run it in stages.")
    end

    batches = ids.each_slice(BULK_CHUNK).map do |chunk|
      SvgBulkOptimizationWorker.perform_async(chunk, bulk_action, current_user.id)
    end

    verb = bulk_action == "optimize" ? "Optimizing" : "Reverting"
    render json: {
      success: true,
      communities: ids.size,
      batches: batches.size,
      message: "#{verb} #{ids.size} #{'property'.pluralize(ids.size)} in the background. Statuses update here as each map finishes."
    }
  end

  private

  # Which properties are in scope, which maps a property has, what may be done
  # to each right now, and how runs get created — all live in
  # SvgOptimizerTargets, shared verbatim with SvgBulkOptimizationWorker. These
  # thin delegations exist so there is never a second copy of a guard that
  # could let a bulk run write where this screen correctly refuses to.
  def eligible_communities
    SvgOptimizerTargets.eligible_communities
  end

  # The eligible set narrowed by the toolbar's SQL-side filters, ordered
  # deterministically (name alone isn't unique, and ties would shuffle rows
  # between pages). The status filter is deliberately NOT here — see
  # paginated_property_rows.
  def filtered_communities
    scope = eligible_communities.includes(:company, :sitemap, :floorplates)

    if params[:q].present?
      scope = scope.where("LOWER(communities.name) LIKE ?", "%#{params[:q].to_s.strip.downcase}%")
    end
    if params[:company].present?
      scope = scope.joins(:company).where("LOWER(companies.name) LIKE ?", "%#{params[:company].to_s.strip.downcase}%")
    end
    case params[:type]
    when "sitemap"    then scope = scope.where(is_sitemap: true)
    when "floorplate" then scope = scope.where(is_sitemap: false)
    end
    case params[:beans]
    when "true"  then scope = scope.where(is_beans_svg: true)
    when "false" then scope = scope.where(is_beans_svg: [false, nil]) # column is nullable on older rows
    end
    scope = apply_partner_filter(scope)

    scope.order(:name, :id)
  end

  # One page of rows, as a will_paginate collection the view can both render
  # and page through.
  #
  # A property's rollup state is computed in Ruby (it compares each map's live
  # file URL against its last run's result), so it can't be a WHERE clause.
  # When the status filter is in play we therefore have to build every matching
  # property before paging; without it — the common case, and the one that has
  # to stay fast as the property count grows — we page in SQL first and only
  # ever build one page's worth of rows.
  def paginated_property_rows(scope)
    if params[:state].present?
      build_property_rows(scope.to_a)
        .select { |row| row[:rollup][:state] == params[:state] }
        .paginate(page: params[:page], per_page: PER_PAGE)
    else
      page = scope.paginate(page: params[:page], per_page: PER_PAGE)
      WillPaginate::Collection.create(page.current_page, page.per_page, page.total_entries) do |pager|
        pager.replace(build_property_rows(page))
      end
    end
  end

  # Builds every row for a set of communities using ONE runs query for the
  # whole set, instead of one per property.
  def build_property_rows(communities)
    latest = latest_by_targets(communities)
    communities.map { |community| build_property_row(community, latest) }
  end

  # One map (when target params are present) or all of the property's maps.
  def requested_targets(community)
    if params[:target_type].present? && params[:target_id].present?
      t = find_target(community, params[:target_type], params[:target_id])
      t ? [t] : []
    else
      resolve_targets(community)
    end
  end

  def enqueue_runs(community, specs)
    SvgOptimizerTargets.enqueue_runs(community, specs, triggered_by_user_id: current_user.id)
  end

  def optimized_now?(run, target)
    SvgOptimizerTargets.optimized_now?(run, target)
  end

  # Resolves a single target from request params, scoped to the community so
  # a caller can't analyze an arbitrary record by id.
  def find_target(community, type, id)
    case type
    when "Floorplate" then community.floorplates.find_by(id: id)
    when "Sitemap"    then community.sitemap&.id.to_s == id.to_s ? community.sitemap : nil
    when "Community"  then community.id.to_s == id.to_s ? beans_background_target(community) : nil
    end
  end

  def resolve_targets(community)
    SvgOptimizerTargets.resolve_targets(community)
  end

  def beans_background_target(community)
    SvgOptimizerTargets.beans_background_target(community)
  end

  def build_property_row(community, latest = latest_by_target(community))
    targets = resolve_targets(community)
    {
      community: community,
      targets: targets.map { |t| { record: t, latest: latest[[t.class.name, t.id]] } },
      rollup: property_rollup(community, targets, latest)
    }
  end

  # Rolls a property up by its CURRENT state (what's live right now), not just
  # "did the last run succeed" — so a property whose maps were optimized then
  # reverted reads "Not optimized", staying in sync with the review screen.
  #   not_started      — no map currently optimized (fresh, or all reverted)
  #   partial          — some maps optimized, some not
  #   done             — every map currently optimized
  #   in_progress      — a run is mid-flight
  #   done_with_errors — a map's last run failed
  def property_rollup(community, targets, latest = nil)
    return { state: "not_applicable", total: 0, done: 0, failed: 0, in_progress: 0 } if targets.empty?
    latest ||= latest_by_target(community)

    total = targets.size
    in_progress = failed = optimized = 0
    targets.each do |t|
      run = latest[[t.class.name, t.id]]
      if run&.in_progress?
        in_progress += 1
      elsif optimized_now?(run, t)
        optimized += 1
      elsif run&.failed?
        failed += 1
      end
    end

    state = if in_progress.positive? then "in_progress"
    elsif failed.positive? then "done_with_errors"
    elsif optimized == total then "done"
    elsif optimized.positive? then "partial"
    else "not_started"
    end

    { state: state, total: total, done: optimized, failed: failed, in_progress: in_progress }
  end

  def latest_by_target(community)
    SvgOptimizerTargets.latest_by_target(community)
  end

  def latest_by_targets(communities)
    SvgOptimizerTargets.latest_by_targets(communities)
  end

  def targets_busy?(community, targets)
    SvgOptimizerTargets.targets_busy?(community, targets)
  end

  def target_status_json(target, run)
    {
      target_type: target.class.name,
      target_id: target.id,
      label: helpers.svg_map_label(target),
      live_url: target.optimizable_svg.url,
      run: run && {
        id: run.id,
        action: run.action,
        status: run.status,
        reduction_pct: run.reduction_pct&.to_f,
        original_bytes: run.original_bytes,
        optimized_bytes: run.optimized_bytes,
        backup_url: run.backup_url,
        error_message: run.error_message,
        revertable: optimized_now?(run, target),
        finished_at: run.finished_at
      }
    }
  end

  def truthy?(val)
    ActiveModel::Type::Boolean.new.cast(val)
  end

  def render_error(message, status: :unprocessable_entity)
    render json: { success: false, message: message }, status: status
  end

  def require_super_admin
    unless current_user&.is_super_admin?
      respond_to do |format|
        format.json { render json: { success: false, message: "Not authorized." }, status: :forbidden }
        format.html { redirect_to root_path, alert: "You are not authorized to view that page." }
      end
    end
  end

  # Partner filter — "any" means enrolled with at least one partner, otherwise
  # a specific partner key. Partner enrollment lives in
  # communities.partner_map_settings (see Community::MAP_PARTNERS), the same
  # source the Partner Configuration screen reads.
  def apply_partner_filter(scope)
    case params[:partner]
    when nil, "" then scope
    when "any"   then scope.with_any_partner
    when "none"  then scope.where.not(id: Community.with_any_partner.select(:id))
    else
      Community::MAP_PARTNER_KEYS.include?(params[:partner]) ? scope.for_partner(params[:partner]) : scope
    end
  end

  # The community ids a bulk trigger should act on. Explicit ids are always
  # re-scoped through eligible_communities, so a hand-crafted request can't
  # aim the tool at a property the list would never show.
  def bulk_community_ids
    if truthy?(params[:select_all_matching])
      matching_community_ids
    else
      explicit = Array(params[:community_ids]).map(&:to_i).reject(&:zero?).uniq
      return [] if explicit.empty?
      eligible_communities.where(id: explicit).pluck(:id)
    end
  end

  # Every community matching the CURRENT filters, across all pages. The status
  # filter is computed in Ruby (see paginated_property_rows), so it can only be
  # applied after the rows are built.
  #
  # filtered_communities carries `includes(:company, :sitemap, :floorplates)`,
  # and because its WHERE references those tables Rails eager-loads them as a
  # LEFT JOIN — so plucking ids straight off it returns one row PER FLOORPLATE,
  # not per property. `.to_a` de-duplicates records but `.pluck` does not, so
  # the joins are dropped here and the ids de-duplicated explicitly. Getting
  # this wrong silently inflates both the count shown to the operator and the
  # MAX_BULK_COMMUNITIES check.
  def matching_community_ids
    if params[:state].present?
      build_property_rows(filtered_communities.to_a)
        .select { |row| row[:rollup][:state] == params[:state] }
        .map { |row| row[:community].id }
        .uniq
    else
      filtered_communities
        .except(:includes, :eager_load, :preload)
        .reorder(:id)
        .distinct
        .pluck(:id)
    end
  end

end
