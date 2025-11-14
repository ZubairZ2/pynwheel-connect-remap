module CommunityHelper
  SMALL_WIDTH  = 200
  SMALL_HEIGHT = 200

  def map_logo_url(community, default_logo = false)
    logo = community.map_logo.presence || community.logo.presence
    
    return ( default_logo ? asset_path("default.jpeg") : asset_path("pynwheel-connect-logo.png") )if logo.blank?
    return logo.url if logo.respond_to?(:url)

    logo.to_s
  end

  def small_map_logo?(community)
    logo = community.map_logo.presence || community.logo.presence
    return false unless logo
    return safe_small_image?(logo) if logo.respond_to?(:width) && logo.respond_to?(:height)
    false
  end

  private

  def safe_small_image?(image)
    image.width < SMALL_WIDTH && image.height < SMALL_HEIGHT
  rescue
    false
  end
end