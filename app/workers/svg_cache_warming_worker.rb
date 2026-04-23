class SvgCacheWarmingWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'critical', retry: 2

  # Warms every SVG map cache for a single community.
  # Only runs for active_client communities that have enable_svg_mode enabled.
  # Safe to call concurrently — SvgCacheService.warm? guards duplicate S3 fetches.
  def perform(community_id)
    community = Community
      .active_client_properties
      .where(enable_svg_mode: true)
      .includes(:sitemap, :floorplates)
      .find_by(id: community_id)

    return unless community

    maps_for(community).each do |map|
      next if SvgCacheService.warm?(map[:id], map[:type])

      svg_url = svg_url_for(map, community)
      next unless svg_url

      SvgCacheService.fetch_and_cache(map[:id], map[:type], svg_url)
    end
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
