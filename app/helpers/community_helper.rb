module CommunityHelper
  SMALL_WIDTH  = 200
  SMALL_HEIGHT = 200

  def map_logo_url(community, timestamp: true)
    logo = community.map_logo.presence || community.logo.presence

    # If no logo at all → default asset
    return asset_path("default.jpeg") if logo.blank?

    # Case 1: CarrierWave / ActiveStorage uploader
    if logo.respond_to?(:url)
      url = logo.url
      return timestamp ? add_timestamp(url) : url
    end

    # Case 2: String (Base64 or stored string value)
    logo.to_s
  end

  def small_map_logo?(community)
    logo = community.map_logo.presence || community.logo.presence
    return false unless logo

    # Only check size if it has width/height methods
    return safe_small_image?(logo) if logo.respond_to?(:width) && logo.respond_to?(:height)

    false
  end

  private

  def add_timestamp(url)
    "#{url}?t=#{rand(10**10)}"
  end

  def safe_small_image?(image)
    image.width < SMALL_WIDTH && image.height < SMALL_HEIGHT
  rescue
    false
  end
end