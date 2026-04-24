class SvgCacheWarmingWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'critical', retry: 0

  # Warms SVG caches for a single community.
  # Only runs when both enable_sdk_map_cache AND enable_svg_mode are true.
  #
  # force_refresh = false (default): fills cold/missing entries only.
  # force_refresh = true (scheduler): always overwrites, keeping SVGs fresh.
  #
  # retry: 0 — retrying an OOM job makes memory worse, not better.
  def perform(community_id, force_refresh = false)
    community = Community
      .active_client_properties
      .where(enable_sdk_map_cache: true, enable_svg_mode: true)
      .includes(:sitemap, :floorplates)
      .find_by(id: community_id)

    return unless community

    maps_for(community).each do |map|
      svg_url = svg_url_for(map, community)
      next unless svg_url

      if force_refresh
        SvgCacheService.refresh(map[:id], map[:type], svg_url)
      else
        next if SvgCacheService.warm?(map[:id], map[:type])
        SvgCacheService.fetch_and_cache(map[:id], map[:type], svg_url)
      end
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
