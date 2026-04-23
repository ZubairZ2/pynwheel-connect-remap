class SvgCacheWarmingWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'critical', retry: 0

  # Refreshes every SVG map cache for a single community.
  # Only runs for active_client communities that have enable_svg_mode enabled.
  # Uses SvgCacheService.refresh (force-write) so each run atomically replaces
  # the old cached SVG with a fresh copy — old memory freed, new memory written.
  # retry: 0 — retrying an OOM job makes memory worse, not better.
  def perform(community_id)
    community = Community
      .active_client_properties
      .where(enable_svg_mode: true)
      .includes(:sitemap, :floorplates)
      .find_by(id: community_id)

    return unless community

    maps_for(community).each do |map|
      svg_url = svg_url_for(map, community)
      next unless svg_url

      SvgCacheService.refresh(map[:id], map[:type], svg_url)
    end
  rescue Redis::BaseError, Errno::ECONNREFUSED => e
    Rails.logger.warn "[SvgCacheWarmingWorker] Redis error for community #{community_id}: #{e.message} — skipping"
  rescue StandardError => e
    Rails.logger.error "[SvgCacheWarmingWorker] Error for community #{community_id}: #{e.message}"
  end

  private

  def maps_for(community)
    if community.is_sitemap?
      sitemap = community.sitemap
      return [] unless sitemap&.id
      [{ id: sitemap.id, type: 'sitemap' }]
    else
      community.floorplates.map { |fp| { id: fp.id, type: 'floorplate' } }
    end
  end

  def svg_url_for(map, community)
    resource = if map[:type] == 'sitemap'
      community.sitemap
    else
      community.floorplates.find { |fp| fp.id == map[:id] }
    end
    return unless resource

    Rails.env.development? ? resource.svg_image.path : resource.validated_svg_image_url
  end
end
