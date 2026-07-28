# Internal staff diagnostic tool — upload a floorplate/sitemap SVG (or point
# it at a URL) and see how much its embedded background image(s) can be
# shrunk, with a before/after performance estimate. Nothing is ever
# persisted: the SVG is read into memory for the duration of the request
# only, never written to S3, the database, or any model. The optimized SVG
# is returned to the browser for client-side download; nothing is kept
# server-side afterward.
require "net/http"
require "ipaddr"
require "resolv"

class SvgOptimizerController < ApplicationController
  before_action :require_super_admin

  MAX_FETCH_BYTES = 20.megabytes
  FETCH_OPEN_TIMEOUT = 5
  FETCH_READ_TIMEOUT = 15
  MAX_REDIRECTS = 3

  def show
  end

  # Phase 2 — production bulk optimize. Lists every community eligible to be
  # touched (enable_svg_mode AND at least one Floorplate/Sitemap with a real
  # svg_image), each with a rolled-up optimization status.
  def properties
    communities = eligible_communities.includes(:company)

    if params[:q].present?
      communities = communities.where("LOWER(communities.name) LIKE ?", "%#{params[:q].to_s.strip.downcase}%")
    end
    if params[:company].present?
      communities = communities.joins(:company).where("LOWER(companies.name) LIKE ?", "%#{params[:company].to_s.strip.downcase}%")
    end
    case params[:type]
    when "sitemap"    then communities = communities.where(is_sitemap: true)
    when "floorplate" then communities = communities.where(is_sitemap: false)
    end

    @properties = communities.order(:name).map { |c| build_property_row(c) }

    if params[:state].present?
      @properties = @properties.select { |row| row[:rollup][:state] == params[:state] }
    end
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
    raw_text = SvgStorageReader.read_uploader(target.svg_image) if raw_text.blank?
    unless raw_text.present? && raw_text.include?("<svg")
      return render_error("Live file could not be read or isn't a valid SVG.")
    end

    result = SvgBackgroundOptimizerService.call(raw_text)
    render json: {
      success: true,
      target_type: target.class.name,
      target_id: target.id,
      label: target_label(target),
      live_url: target.svg_image.url,
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

  def optimize
    raw_text = resolve_raw_text
    return if performed?

    unless raw_text.present? && raw_text.include?("<svg")
      return render_error("That doesn't look like a valid SVG file.")
    end

    result = SvgBackgroundOptimizerService.call(raw_text)
    render json: { success: true }.merge(result)
  rescue StandardError => e
    Rails.logger.error("[SvgOptimizerController] #{e.class}: #{e.message}")
    render_error("Something went wrong while processing that file: #{e.message}")
  end

  private

  def resolve_raw_text
    if params[:svg_url].present?
      fetch_from_url(params[:svg_url].to_s.strip)
    elsif params[:svg_file].present?
      read_upload(params[:svg_file])
    else
      render_error("Please choose an SVG file or enter a URL.")
      nil
    end
  end

  def read_upload(file)
    unless file.respond_to?(:read)
      render_error("Upload was not received correctly. Please try again.")
      return nil
    end

    if file.size.to_i > MAX_FETCH_BYTES
      render_error("File is too large (#{(file.size / 1.megabyte.to_f).round(1)}MB). Max is #{MAX_FETCH_BYTES / 1.megabyte}MB.")
      return nil
    end

    file.read.force_encoding("UTF-8")
  end

  # Fetches a remote SVG with basic SSRF hardening (http/https only, no
  # private/loopback/link-local targets, bounded redirects, size-capped
  # streaming read) since this endpoint lets a signed-in user make the
  # server issue an outbound request to an arbitrary URL.
  def fetch_from_url(url, redirects_left = MAX_REDIRECTS)
    uri = safe_parse_uri(url)
    return nil unless uri

    response_body = nil
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
                    open_timeout: FETCH_OPEN_TIMEOUT, read_timeout: FETCH_READ_TIMEOUT) do |http|
      request = Net::HTTP::Get.new(uri)
      http.request(request) do |res|
        case res
        when Net::HTTPRedirection
          if redirects_left <= 0
            render_error("Too many redirects fetching that URL.")
            next
          end
          location = res["location"]
          return fetch_from_url(location, redirects_left - 1)
        when Net::HTTPSuccess
          body = +""
          res.read_body do |chunk|
            body << chunk
            if body.bytesize > MAX_FETCH_BYTES
              render_error("Fetched file exceeds max size (#{MAX_FETCH_BYTES / 1.megabyte}MB).")
              return nil
            end
          end
          response_body = body
        else
          render_error("Failed to fetch URL (HTTP #{res.code}).")
        end
      end
    end
    response_body&.force_encoding("UTF-8")
  rescue StandardError => e
    render_error("Failed to fetch URL: #{e.message}")
    nil
  end

  def safe_parse_uri(url)
    uri = URI.parse(url)

    unless uri.is_a?(URI::HTTP) && uri.host.present? # covers both http and https
      render_error("URL must start with http:// or https://")
      return nil
    end

    resolved_ips = Resolv.getaddresses(uri.host)
    if resolved_ips.empty?
      render_error("Could not resolve host: #{uri.host}")
      return nil
    end

    if resolved_ips.any? { |ip| unsafe_ip?(ip) }
      render_error("That URL points to a non-public address and can't be fetched.")
      return nil
    end

    uri
  rescue URI::InvalidURIError
    render_error("That's not a valid URL.")
    nil
  end

  def unsafe_ip?(ip_string)
    ip = IPAddr.new(ip_string)
    ip.loopback? || ip.private? || ip.link_local?
  rescue IPAddr::Error
    true
  end

  # ---- Phase 2 helpers -------------------------------------------------------

  # Communities that could have a real embedded background to optimize:
  # enable_svg_mode on, AND at least one target with a non-blank svg_image.
  # is_sitemap properties are matched via their sitemap; the rest via their
  # floorplates.
  def eligible_communities
    sitemap_ids = Community
      .where(enable_svg_mode: true, is_sitemap: true)
      .joins(:sitemap)
      .where.not(sitemaps: { svg_image: [nil, ""] })
      .pluck(:id)

    floorplate_ids = Community
      .where(enable_svg_mode: true, is_sitemap: false)
      .joins(:floorplates)
      .where.not(floorplates: { svg_image: [nil, ""] })
      .distinct
      .pluck(:id)

    Community.where(id: (sitemap_ids + floorplate_ids).uniq)
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
    run.resulting_url.blank? || target.svg_image.url == run.resulting_url
  end

  # Resolves a single target from request params, scoped to the community so
  # a caller can't analyze an arbitrary record by id.
  def find_target(community, type, id)
    case type
    when "Floorplate" then community.floorplates.find_by(id: id)
    when "Sitemap"    then community.sitemap&.id.to_s == id.to_s ? community.sitemap : nil
    end
  end

  # The concrete Floorplate/Sitemap record(s) this property's map lives in.
  def resolve_targets(community)
    if community.is_sitemap?
      sm = community.sitemap
      sm && sm.svg_image.present? ? [sm] : []
    else
      community.floorplates.where.not(svg_image: [nil, ""]).to_a
    end
  end

  def build_property_row(community)
    targets = resolve_targets(community)
    latest = latest_by_target(community)
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
    SvgOptimizationRun
      .latest_per_target(SvgOptimizationRun.for_community(community))
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
      label: target_label(target),
      live_url: target.svg_image.url,
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

  def target_label(target)
    if target.is_a?(Sitemap)
      "Site map"
    else
      name = target.name.presence || target.range.presence
      name ? "Floor #{name}" : "Floorplate ##{target.id}"
    end
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
