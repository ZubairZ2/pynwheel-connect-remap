# Single source of truth for "which maps does this property have, and what may
# we legally do to each one right now?"
#
# This logic used to live only in SvgOptimizerController's private section,
# which meant the only safe way to trigger a run was a staff member clicking
# through the UI one property at a time. SvgBulkOptimizationWorker needs the
# exact same rules to loop over many communities, so they live here and the
# controller delegates — there must never be two copies of these guards, or a
# bulk run could write where a manual run correctly refuses to.
#
# Nothing here writes to a map file. enqueue_runs only creates `queued`
# SvgOptimizationRun rows and hands each to SvgOptimizationWorker, which owns
# the actual backup/verify/write pipeline.
module SvgOptimizerTargets
  module_function

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

  # The maps on this property that may be optimized right now: everything not
  # already sitting on our optimized output. A map that IS optimized is
  # excluded rather than re-optimized, because its backup holds the true
  # original and re-optimizing would re-encode an already-WebP file.
  def optimizable_targets(community, targets: nil, latest: nil)
    targets ||= resolve_targets(community)
    latest ||= latest_by_target(community)
    targets.reject { |t| optimized_now?(latest[[t.class.name, t.id]], t) }
  end

  # The optimize runs on this property that may be reverted right now — i.e.
  # whose output is still the live file. Returns the SOURCE runs, because a
  # revert needs its reverts_run reference to find the backup to restore.
  def revertable_runs(community, targets: nil, latest: nil)
    targets ||= resolve_targets(community)
    latest ||= latest_by_target(community)
    targets.filter_map do |t|
      run = latest[[t.class.name, t.id]]
      run if optimized_now?(run, t)
    end
  end

  # Creates a queued run + enqueues a worker for each spec
  # ({ target:, action:, reverts_run: }). Returns the created run ids.
  def enqueue_runs(community, specs, triggered_by_user_id: nil)
    specs.map do |spec|
      run = SvgOptimizationRun.create!(
        community: community,
        target: spec[:target],
        action: spec[:action],
        status: "queued",
        reverts_run: spec[:reverts_run],
        triggered_by_user_id: triggered_by_user_id
      )
      SvgOptimizationWorker.perform_async(run.id)
      run.id
    end
  end
end
