# Builds the CMS side of the neighborhood: the config block that rides along on
# the map payload, and the property-curated pins served by
# GET /api/partner/maps/fetch_neighborhood.
#
# Database only — nothing here talks to Google. The live nearby-search half
# lives in SdkNeighborhoodPlacesService, so the two can be cached, tested and
# migrated independently.
#
# Deliberately separate from SdkPayloadBuilderService: that service runs on
# every map boot, while the pins are fetched only when a visitor opens the
# neighborhood panel. Only #discovery_json is on the boot path, and it costs one
# COUNT on top of an association the controller already preloads.
class SdkNeighborhoodBuilderService
  DEFAULT_PAGE_NAME = "Neighborhood".freeze

  # The fallbacks the legacy jbuilder applied when the CMS row left them blank
  # (app/views/api/v1/communities/data.json.jbuilder:1553-1554).
  DEFAULT_RADIUS = 5000  # metres
  DEFAULT_ZOOM   = 14

  def initialize(community)
    @community = community
  end

  # Neighborhood is a Pynwheel Touch feature, so it needs both the product
  # toggle and the property's own "show neighborhood" switch.
  def enabled?
    return false unless @community.pynwheel_touch_enabled?

    neighborhood.present? && neighborhood.show_neighborhood?
  end

  # Whether the live Google half can run at all: the feature on, a key
  # configured, and a centre to search around. Lets the host hide the category
  # rail instead of rendering tabs that resolve to nothing.
  def places_enabled?
    enabled? && ENV["GOOGLE_MAPS_API_KEY"].present? && center_present?
  end

  # Cheap COUNT for the discovery block — never loads rows.
  def location_count
    return 0 unless enabled?

    Location.where(neighborhood_id: neighborhood.id).count
  end

  # The categories the property enabled in the CMS, normalised to stable slugs.
  # The column is a comma-separated string of display labels; unrecognised and
  # duplicate entries are dropped rather than shipped as dead tabs.
  def categories
    return [] unless enabled?

    neighborhood.category.to_s.split(",").filter_map { |raw|
      slug = SdkNeighborhoodCategories.slug_for(raw)
      next if slug.nil? || slug == SdkNeighborhoodCategories::OTHER

      { id: slug, title: SdkNeighborhoodCategories.label_for(slug) }
    }.uniq { |category| category[:id] }
  end

  # Enough for the host to decide whether to render a Neighborhood entry point,
  # and to draw the map before any content arrives. The pins themselves come
  # from fetch_neighborhood, the live places from fetch_neighborhood_places.
  def discovery_json
    {
      enabled:           enabled?,
      pageName:          neighborhood&.neighborhood_name.presence || DEFAULT_PAGE_NAME,
      displayOnHomepage: neighborhood&.display_neighborhood_on_homepage || false,
      center:            center,
      radius:            radius,
      zoom:              zoom,
      address:           formatted_address,
      listing:           neighborhood&.listing.presence,
      categories:        categories,
      locationCount:     location_count,
      placesEnabled:     places_enabled?
    }
  end

  # Property-curated pins, ordered as the CMS lists them. Rows without
  # coordinates are skipped — the legacy jbuilder shipped them as a pin at
  # (0, 0), in the Gulf of Guinea.
  def build
    return [] unless enabled?

    neighborhood.locations.filter_map { |location| location_json(location) }
  end

  # Centre of the neighborhood map. Taken from the community, not from
  # neighborhoods.latitude/longitude: the jbuilder switched to that years ago
  # (those lines are commented out at data.json.jbuilder:1549-1550) and the CMS
  # keeps the community columns current on every address change.
  def center
    { lat: @community.latitude.to_f, lng: @community.longitude.to_f }
  end

  def radius
    neighborhood&.radius.presence&.to_i || DEFAULT_RADIUS
  end

  def zoom
    neighborhood&.zoom.presence&.to_i || DEFAULT_ZOOM
  end

  def formatted_address
    [@community.address, @community.city, @community.state, @community.zip]
      .map { |part| part.to_s.strip.presence }
      .compact
      .join(", ")
      .presence
  end

  private

  def neighborhood
    return @neighborhood if defined?(@neighborhood)

    @neighborhood = @community.neighborhood
  end

  def center_present?
    @community.latitude.present? && @community.longitude.present?
  end

  # Shares its shape with SdkNeighborhoodPlacesService#place_json so a host can
  # concatenate curated pins and Google results into one list and render them
  # with a single component. `source` is what tells them apart.
  def location_json(location)
    return nil if location.latitude.blank? || location.longitude.blank?

    slug = SdkNeighborhoodCategories.slug_for(location.category)

    {
      id:            location.id,
      title:         location.title,
      address:       location.address.presence,
      lat:           location.latitude.to_f,
      lng:           location.longitude.to_f,
      category:      slug,
      categoryLabel: SdkNeighborhoodCategories.label_for_value(location.category),
      imageUrl:      image_url(location),
      thumbUrl:      thumb_url(location),
      distance:      distance_for(location),
      travelTime:    location.time.presence,
      rating:        location.rating&.positive? ? location.rating.to_f : nil,
      source:        "curated"
    }
  end

  # Prefers the denormalised column over the uploader: cheaper, and it still
  # resolves for legacy rows whose file has since gone missing.
  def image_url(location)
    finalize(location.standard_image_url.presence || version_url(location), location)
  end

  # The :thumb version has always existed on AvatarUploader and was never
  # shipped — the jbuilder sent the full-size pin photo to a 60px list tile.
  def thumb_url(location)
    finalize(version_url(location, :thumb), location)
  end

  def version_url(location, version = nil)
    return nil if location.image.blank?

    version ? location.image.url(version) : location.image.url
  rescue StandardError
    nil
  end

  # S3 Transfer Acceleration, as every other SDK asset gets, plus a version
  # stamp so a re-uploaded pin photo is not served from cache forever.
  def finalize(url, location)
    return nil if url.blank?

    accelerated = location.convert_to_s3_accelerate_url(url)
    stamp       = location.updated_at&.to_i
    return accelerated if stamp.nil?

    accelerated.include?("?") ? "#{accelerated}&v=#{stamp}" : "#{accelerated}?v=#{stamp}"
  end

  # The CMS field is free text an operator fills in by hand and usually leaves
  # blank; fall back to the real distance from the property.
  def distance_for(location)
    return location.distance.to_f.round(1) if location.distance.to_f.positive?

    SdkGeoDistance.miles_between(
      @community.latitude, @community.longitude,
      location.latitude,   location.longitude
    )
  end
end
