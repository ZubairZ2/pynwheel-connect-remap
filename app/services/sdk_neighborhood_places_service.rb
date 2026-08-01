# Live "what's nearby" results from Google Places, served by
# GET /api/partner/maps/fetch_neighborhood_places.
#
# The whole point of this class is that a visitor opening the neighborhood panel
# must not cost a Google call. Results are cached per property per category for
# a day, so a property's places are fetched roughly seven times in 24 hours no
# matter how many people look at them — versus the legacy proxy
# (Api::V1::CommunitiesController#get_neighbourhood_data), which billed a fresh
# call on every single tab tap.
#
# HTTP only. The CMS half — config, curated pins — is
# SdkNeighborhoodBuilderService.
class SdkNeighborhoodPlacesService
  NEARBY_ENDPOINT = "https://maps.googleapis.com/maps/api/place/nearbysearch/json".freeze

  # Google returns up to 20 per type. A category like "shopping" fans out over
  # ten types, so cap what we keep after distance sorting — past ~40 pins a map
  # panel is unreadable and the payload is just weight.
  MAX_RESULTS_PER_CATEGORY = 40

  # Types are fetched in parallel because they are pure IO wait. Five at a time
  # turns the ten-call "shopping" fan-out from ~5s serial into well under a
  # second, without opening ten sockets at once.
  MAX_CONCURRENCY = 5

  CACHE_TTL = 24.hours
  TIMEOUT   = 5

  # Soft daily ceiling on Google calls per property, as a backstop for the cache
  # being cold or unavailable. Overridable per environment.
  DEFAULT_DAILY_BUDGET = 200

  # Google keeps returning places that have shut down; they are noise on a
  # "what's near me" panel.
  CLOSED_STATUSES = %w[CLOSED_PERMANENTLY CLOSED_TEMPORARILY].freeze

  def initialize(community, builder: nil)
    @community = community
    @builder   = builder || SdkNeighborhoodBuilderService.new(community)
    @limited   = false
  end

  def available?
    @builder.places_enabled?
  end

  # True when a fan-out was skipped because the daily budget was spent. The host
  # uses it to say "showing saved places only" rather than showing nothing.
  def limited?
    @limited
  end

  # Every category the property enabled, each with its places nested. One HTTP
  # round trip for the host — enough to draw the category rail with its counts
  # and switch tabs without going back to the network.
  #
  # Each category is cached independently, so this only pays Google for the ones
  # that have gone cold.
  def fetch_all
    return [] unless available?

    @builder.categories.map { |category| category_json(category[:id]) }
  end

  # A single category, same shape as one element of #fetch_all.
  def fetch(slug)
    return nil unless available?
    return nil unless SdkNeighborhoodCategories.known?(slug)

    category_json(slug)
  end

  private

  def category_json(slug)
    places = cached_places(slug)

    {
      id:     slug,
      title:  SdkNeighborhoodCategories.label_for(slug),
      count:  places.size,
      places: places.map { |place| with_photos(place) }
    }
  end

  # The cache holds normalised places carrying a raw `photo_ref`. Proxy URLs are
  # derived at serve time (#with_photos) so the reference itself — which is only
  # usable with our Google key — never reaches a client, and the cached blob
  # stays valid whichever host is serving it.
  def cached_places(slug)
    cached = Rails.cache.read(cache_key(slug))
    return cached if cached

    places = build_places(slug)

    # A budget-limited run returns an empty list that says nothing about the
    # real world — caching it would lock the category empty for a day.
    Rails.cache.write(cache_key(slug), places, expires_in: CACHE_TTL) unless @limited

    places
  end

  def build_places(slug)
    types = SdkNeighborhoodCategories.types_for(slug)
    return [] if types.empty?

    unless reserve_budget(types.size)
      @limited = true
      return []
    end

    places = fetch_types(types)
      .filter_map { |row| place_json(row, slug) }
      .uniq { |place| place[:id] }
      .sort_by { |place| place[:distance] || Float::INFINITY }
      .first(MAX_RESULTS_PER_CATEGORY)

    # Registered once here, on the cold path, in a single cache round trip. The
    # handles live an hour longer than the payload below, so every cached place
    # is guaranteed a resolvable photo handle and serving needs no I/O.
    SdkNeighborhoodPhotoService.register(places.map { |place| place[:photo_ref] })

    places
  end

  # Bounded parallel fan-out. Each thread does nothing but wait on a socket and
  # swallows its own failures, so one bad type cannot take the category down.
  def fetch_types(types)
    types.each_slice(MAX_CONCURRENCY).flat_map do |batch|
      batch.map { |type| Thread.new { nearby_search(type) } }.flat_map(&:value)
    end
  end

  def nearby_search(type)
    response = HTTParty.get(
      NEARBY_ENDPOINT,
      query: {
        # rankby=distance returns the nearest results and is mutually exclusive
        # with radius, so the CMS radius is applied afterwards in #place_json.
        # Ranking by distance is what makes a neighborhood panel useful; the
        # legacy proxy passed a radius and got back whatever Google considered
        # prominent, which on a wide radius meant landmarks across town.
        rankby:   "distance",
        type:     type,
        location: "#{@community.latitude},#{@community.longitude}",
        key:      ENV["GOOGLE_MAPS_API_KEY"]
      },
      timeout: TIMEOUT
    )

    body = response.parsed_response
    return [] unless body.is_a?(Hash)

    unless %w[OK ZERO_RESULTS].include?(body["status"])
      Rails.logger.warn("[SdkNeighborhoodPlaces] community=#{@community.id} type=#{type} status=#{body['status']}")
      return []
    end

    Array(body["results"])
  rescue StandardError => e
    Rails.logger.warn("[SdkNeighborhoodPlaces] community=#{@community.id} type=#{type} #{e.class}: #{e.message}")
    []
  end

  # Shares its shape with SdkNeighborhoodBuilderService#location_json so a host
  # can concatenate curated pins and Google results into one list. `source` is
  # what tells them apart. Returns nil for anything unmappable or out of range.
  def place_json(row, slug)
    return nil if CLOSED_STATUSES.include?(row["business_status"])

    lat = row.dig("geometry", "location", "lat")
    lng = row.dig("geometry", "location", "lng")
    return nil if lat.blank? || lng.blank?

    distance = SdkGeoDistance.miles_between(@community.latitude, @community.longitude, lat, lng)
    return nil if distance && radius_miles && distance > radius_miles

    {
      id:               row["place_id"],
      title:            row["name"],
      address:          row["vicinity"].presence || row["formatted_address"].presence,
      lat:              lat.to_f,
      lng:              lng.to_f,
      category:         slug,
      categoryLabel:    SdkNeighborhoodCategories.label_for(slug),
      photo_ref:        row.dig("photos", 0, "photo_reference"),
      distance:         distance,
      travelTime:       nil,
      rating:           row["rating"]&.to_f,
      userRatingsTotal: row["user_ratings_total"]&.to_i,
      isOpenNow:        row.dig("opening_hours", "open_now"),
      priceLevel:       row["price_level"],
      source:           "google"
    }
  end

  # Swap the raw photo reference for proxy paths on our own host. Pure hashing,
  # no I/O — the reference was registered when the category was built.
  def with_photos(place)
    handle = SdkNeighborhoodPhotoService.handle_for(place[:photo_ref])

    place.except(:photo_ref).merge(
      imageUrl: SdkNeighborhoodPhotoService.path(handle, SdkNeighborhoodPhotoService::LARGE_WIDTH),
      thumbUrl: SdkNeighborhoodPhotoService.path(handle, SdkNeighborhoodPhotoService::THUMB_WIDTH)
    )
  end

  def radius_miles
    return @radius_miles if defined?(@radius_miles)

    @radius_miles = SdkGeoDistance.metres_to_miles(@builder.radius)
  end

  def cache_key(slug)
    "sdk:nbhd:places:#{@community.id}:#{slug}:#{@builder.radius}"
  end

  # Approximate on purpose: this is a cost backstop, not an accounting ledger,
  # and it only ever runs on a cache miss. Two simultaneous misses can overspend
  # by one fan-out, which is cheaper than the round trips exact accounting would
  # cost on every request.
  def reserve_budget(calls)
    key  = budget_key
    used = Rails.cache.read(key).to_i
    return false if used + calls > daily_budget

    Rails.cache.write(key, used + calls, expires_in: 25.hours)
    true
  end

  def budget_key
    "sdk:nbhd:budget:#{@community.id}:#{Date.current.iso8601}"
  end

  def daily_budget
    ENV.fetch("NEIGHBORHOOD_DAILY_BUDGET", DEFAULT_DAILY_BUDGET).to_i
  end
end
