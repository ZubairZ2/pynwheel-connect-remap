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

  private

  # Communities that could have a real embedded background to optimize:
  # enable_svg_mode on, AND at least one target with a non-blank SVG.
  # is_sitemap properties are matched via their sitemap; the rest via their
  # floorplates; Beans properties also via their own shared background map,
  # which alone makes a property worth listing.
  #
  # Written as EXISTS subqueries rather than three id plucks so the database
  # does the filtering: this stays one query, and the result is a relation the
  # caller can still filter, order and paginate instead of a materialised id
  # list that grows with the property count.
  def eligible_communities
    Community.where(enable_svg_mode: true).where(<<~SQL.squish)
      (
        communities.is_sitemap = TRUE AND EXISTS (
          SELECT 1 FROM sitemaps
          WHERE sitemaps.community_id = communities.id
            AND COALESCE(sitemaps.svg_image, '') <> ''
        )
      ) OR (
        communities.is_sitemap = FALSE AND EXISTS (
          SELECT 1 FROM floorplates
          WHERE floorplates.community_id = communities.id
            AND COALESCE(floorplates.svg_image, '') <> ''
        )
      ) OR (
        communities.is_beans_svg = TRUE
          AND COALESCE(communities.background_svg_image, '') <> ''
      )
    SQL
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

  # Creates a queued run + enqueues a worker for each spec
  # ({ target:, action:, reverts_run: }). Returns the created run ids.
  def enqueue_runs(community, specs)
    specs.map do |spec|
      run = SvgOptimizationRun.create!(
        community: community,
        target: spec[:target],
        action: spec[:action],
        status: "queued",
        reverts_run: spec[:reverts_run],
        triggered_by_user_id: current_user.id
      )
      SvgOptimizationWorker.perform_async(run.id)
      run.id
    end
  end

  # True only when the live file is STILL the optimized output `run` produced —
  # i.e. the map is currently in an OPTIMIZED state, so it can be reverted and
  # must NOT be re-optimized. It becomes false the moment the live file stops
  # matching that run's resulting_url, which happens on a revert OR on a fresh
  # CMS re-upload of the floorplate/sitemap — either way the map is back on an
  # original/fresh file and is optimizable again (and reverting an old backup
  # over a new CMS file is correctly refused).
  def optimized_now?(run, target)
    return false unless run && run.action == "optimize" && run.status == "uploaded" && run.backup_url.present?
    run.resulting_url.blank? || target.optimizable_svg.url == run.resulting_url
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

  # Every record whose SVG this property's live map is assembled from: the
  # Beans background map (the shared base layer, when the property has one)
  # first, then the interactive sitemap/floorplate overlay(s) on top.
  # Filters the floorplates in Ruby rather than SQL so a preloaded association
  # (the list page loads them all in one query) isn't thrown away by a fresh
  # per-property WHERE. `read_attribute` matches the old SQL exactly: the
  # column is set and non-empty.
  def resolve_targets(community)
    overlays =
      if community.is_sitemap?
        sm = community.sitemap
        sm && sm.svg_image.present? ? [sm] : []
      else
        community.floorplates.select { |fp| fp.read_attribute(:svg_image).present? }
      end

    [beans_background_target(community), *overlays].compact
  end

  # The community itself is the target for a Beans property's background map —
  # the file lives on Community#background_svg_image (see SvgOptimizableMap).
  def beans_background_target(community)
    community if community.is_beans_svg? && community.background_svg_image.present?
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
    latest_by_targets([community])
  end

  # Latest run per target across MANY communities in one query. A target is
  # identified globally by [target_type, target_id], so one map keyed that way
  # serves every property on the page — which is what keeps the list from
  # issuing a runs query per property.
  def latest_by_targets(communities)
    community_ids = communities.map(&:id)
    return {} if community_ids.empty?

    SvgOptimizationRun
      .latest_per_target(SvgOptimizationRun.where(community_id: community_ids))
      .index_by { |r| [r.target_type, r.target_id] }
  end

  # Any queued/running/verified run on one of these targets means a worker may
  # be mid-write — block a second trigger to prevent two workers racing.
  def targets_busy?(community, targets)
    return false if targets.empty?
    keys = targets.map { |t| [t.class.name, t.id] }
    SvgOptimizationRun
      .for_community(community)
      .where(status: SvgOptimizationRun::IN_PROGRESS_STATUSES)
      .where(target_type: keys.map(&:first), target_id: keys.map(&:last))
      .exists?
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
end
