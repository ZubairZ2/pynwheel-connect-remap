class SdkPayloadBuilderService
  include ApplicationHelper
  include CommunitiesHelper

  def initialize(community)
    @community = community
  end

  # group_units: the caller asks for the student-housing rollup. Opt-in rather
  # than implied by the property's toggle, because fetch_data serves both SDKs:
  # pyn-map-sdk.js (v0) has no concept of a unit space, so it must keep getting
  # the flat payload whatever the property is configured as.
  def build(ops_map: false, group_units: false)
    @group_units = group_units
    @timings     = {}

    units_ar = section(:load_units) do
      @community.units.map_units(@community, ops_map).visible_units.without_hidden_names.to_a
    end
    units_ar.each { |u| u.association(:community).target = @community }
    attach_floorplans(units_ar)

    # Only `units` is grouped. floorplans_json and filters_json keep reading the
    # flat list: a floor plan's unit count and a filter's option list must both
    # describe what a resident can actually lease, so a price band or an
    # availability window that exists on only one bedroom still has to appear.
    all_units = section(:units) do
      grouped_units? ? grouped_units_json(units_ar, Set.new, ops_map)
                     : units_json(Set.new, ops_map, units_ar)
    end

    {
      property:    section(:property) { property_json(ops_map) },
      # Top level, not nested under `property`: the gallery is its own feature
      # with its own endpoints, and the SDK serves it through getGalleryConfig()
      # rather than making hosts dig through the property blob.
      gallery:     section(:gallery)     { gallery_discovery_json },
      sitemap:     section(:sitemap)     { sitemap_json },
      backgroundSvg: section(:background) { background_svg_json },
      floorplates: section(:floorplates) { floorplates_json },
      units:       all_units,
      floorplans:  section(:floorplans)  { floorplans_json(units_ar) },
      amenities:   section(:amenities)   { amenities_json },
      filters:     section(:filters)     { filters_json(units_ar, ops_map) },
      status:      "success",
      code:        200
    }
  end

  # Milliseconds spent in each section of the last #build, keyed by section name.
  #
  # Published by the controller as Server-Timing. A payload can be slow for
  # reasons that never touch the database -- an image decode, an S3 read, a
  # regex over every unit -- and a query count alone cannot tell those apart
  # from each other. This says which part of the payload the time went into.
  attr_reader :timings

  # Records how long the block took under `name` and returns its value. The
  # measurement is monotonic and costs two clock reads, so it stays on in
  # production; the timings are worthless if they are only collected when
  # somebody already suspects a problem.
  def section(name)
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    yield
  ensure
    (@timings ||= {})[name] = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round(1)
  end

  # The property and gallery blocks alone — no units, floor plans, amenities or
  # filters, and none of the queries that build them.
  #
  # This is everything the standalone touch pages (gallery, favorites,
  # neighborhood) actually read: they call getPropertyConfig() for branding and
  # feature flags, then fetch their own content from their own endpoints. They
  # never call getUnits() / getFloorplans() / getFiltersData().
  #
  # Worth its own path because #build is dominated by the unit rollup — on a
  # 276-unit property that is ~6,700 queries and ~1.6s to serialize 1.5MB the
  # standalone pages immediately discard. These two blocks cost single-digit
  # queries and a few KB.
  # Takes group_units for the same reason #build does: property_json reports
  # unitGrouping.mode, and that has to describe what this client asked for, or a
  # config-only boot would tell a student-housing host its property is flat.
  def build_config(ops_map: false, group_units: false)
    @group_units = group_units

    {
      property: property_json(ops_map),
      gallery:  gallery_discovery_json,
      status:   "success",
      code:     200
    }
  end

  def units_json(fav_ids = Set.new, ops_map = false, units_ar = nil)
    units = units_ar || @community.units.map_units(@community, ops_map).visible_units.without_hidden_names.includes(:floorplan)
    units&.map { |unit| unit_json(unit, fav_ids) }
  end

  # Relabels standalone bedrooms with their apartment number -- "501-A" -> "501".
  #
  # For callers that serialize favorited units straight through units_json rather
  # than lifting them out of a door (get_favorites, which serves the shared
  # favorites link). Those cards sit beside units-list cards that are already
  # labelled with the apartment number, so without this the same bedroom reads
  # "501" in one tab and "501-A" in another.
  #
  # Uses the grouper's own rule, so this and the units list can never disagree
  # about what an apartment is called. No-op on every non-student property, and
  # on any name with no bedroom suffix to strip.
  def door_labelled(entries)
    return entries unless @community.student_housing_property?

    Array(entries).map do |entry|
      apartment = SdkUnitSpaceGrouper.apartment_number(entry[:unitMarketingName] || entry[:unitNumber])
      next entry unless apartment

      entry.merge(unitNumber: apartment, unitMarketingName: apartment)
    end
  end

  # The same units, rolled up to one entry per plotted position — see
  # SdkUnitSpaceGrouper for why the plot is the grouping key.
  #
  # A position holding one unit serializes exactly as it does on the flat path,
  # so the common shape is untouched. A position holding several emits its base
  # unit, the roll-up fields the map and the filters read, and the bedrooms
  # themselves under `spaces`.
  #
  # Every door is labelled with its apartment number, whether or not more than
  # one bedroom happens to be plotted on it — a units list that reads
  # "100-A, 103, 105" mixes bedroom names with apartment names and looks broken.
  # See SdkUnitSpaceGrouper.apartment_number for how a lone bedroom is resolved.
  def grouped_units_json(units_ar, fav_ids = Set.new, ops_map = false)
    SdkUnitSpaceGrouper.new(@community).call(units_ar).map do |group|
      # Each unit in the group is serialized exactly once — the base is
      # group.spaces.first, so rendering it again for the door would double the
      # per-unit work on every apartment.
      rendered = group.spaces.map { |unit| unit_json(unit, fav_ids) }
      base     = rendered.first
      name     = SdkUnitSpaceGrouper.door_name(group.spaces.map(&:marketing_name))
      base     = base.merge(unitNumber: name, unitMarketingName: name) if name

      next base.merge(spaceCount: 1) if group.single?

      base = base.merge(space_rollup(group.spaces, ops_map))
      base.merge(spaces: rendered.map { |unit| space_json(unit) })
    end
  end

  # Keys the rollup adds to a base unit so it can speak for its whole apartment.
  # Named as a set so a single bedroom can be lifted back out of a group without
  # dragging the group's aggregates along — see #space_as_unit.
  ROLLUP_KEYS = %i[
    spaceCount availableSpaceCount availabilityBuckets
    priceMin priceMax sqftMin sqftMax
    unitStatuses mixedStatus
  ].freeze

  # One space, lifted back out to a complete standalone unit: the base unit's
  # shared fields, minus everything that only describes the group, plus the
  # space's own values. The space's rent and availability win on merge, which is
  # what turns an apartment-level "from $1,200" back into that bedroom's price.
  #
  # The one thing that does NOT win is the name. A lifted bedroom is labelled
  # with its door's apartment number -- "501", not "501-A" -- because it is shown
  # by the same card the units list uses, and that list already labels every door
  # with its apartment number (see #grouped_units_json). Letting the bedroom's own
  # name through put "501-A" on a favorites card sitting beside a units card
  # reading "501", which reads as two different apartments. The letter is not lost:
  # it stays on `space.letter`, which is where clients read it from.
  #
  # This is the server-side twin of the merge the SDK does client-side, for the
  # places a response has to hand back single bedrooms rather than doors.
  DOOR_OWNED_KEYS = %i[unitNumber unitMarketingName].freeze

  def self.space_as_unit(grouped_unit, space)
    grouped_unit.except(:spaces, :hasFavoriteSpace, *ROLLUP_KEYS)
                .merge(space)
                .merge(grouped_unit.slice(*DOOR_OWNED_KEYS))
  end

  # One unit, in the full map-facing shape. Extracted from units_json so the
  # grouped student-housing path serializes its base units through exactly the
  # same code — the two paths must never drift apart on what a unit looks like.
  def unit_json(unit, fav_ids = Set.new)
    floorplan = unit.floorplan
    fees      = @community.get_additional_fees(unit)
    buttons   = unit_additional_buttons(unit)
    description, description_title, expand_description = description_fields(unit, floorplan)
    primary_image, secondary_image = unit_images(unit, floorplan)

    {
      unitNumber:      unit.api_unit_marketing_name,
      unitMarketingName: unit.api_unit_marketing_name,
      mapId:           map_for_unit(unit),
      unitId:          unit.id,
      # The PMS's own id for this unit, alongside ours. Analytics publishes this
      # one as `unit_id` (PYN-1655 asks for the id "from data provider"), because
      # it is the only id a client can reconcile against their own systems —
      # `unitId` above is a Pynwheel primary key and means nothing to them.
      # Already on the loaded row, so this costs no query.
      providerUnitId:  unit.provider_unit_id,
      building:        unit.building,
      floor:           unit.floor,
      sold:            unit.sold,
      x_plot:          unit.x_plot.to_i,
      y_plot:          unit.y_plot.to_i,
      bedrooms:        floorplan.present? ? hide_decimals(floorplan.bedrooms)  : nil,
      bathrooms:       floorplan.present? ? hide_decimals(floorplan.bathrooms) : nil,
      square_feet:     if unit.square_feet?
                         hide_decimals(unit.square_feet)
                       elsif floorplan.present?
                         hide_decimals(floorplan.square_feet)
                       end,
      floorplanId:            unit.floorplan_id,
      providerFloorplanId:    floorplan&.provider_floorplan_id,
      floorplanName:          floorplan&.name,
      pointerData:            unit.pointer_data,
      market_rent:            unit.get_market_rent(),
      availability:           unit.availability,
      availability_url:       unit.get_availability_url(),
      available_date:         unit.available_date,
      available:              unit.available,
      available_now:          unit.available_now?,
      availability_bucket:    unit.availability_bucket,
      # Floorplan-level enum (available|limited_availability|almost_gone|sold_out),
      # repeated on the unit so the host can render the banner from a unit alone —
      # the same thing the old map does through floorplan_map_config.
      availability_status:    floorplan&.availability_status,
      lease_term:             unit.lease_term,
      lease_pricing:          unit.get_lease_term_pricing_matrix(),
      description:            description,
      description_title:      description_title,
      expandDescriptionInPopup: expand_description,
      display_rent:           unit&.community&.display_rent,
      additional_fees:        fees,
      property_id:            unit.property_id,
      unit_status:            unit&.unit_status,
      model_unit:             unit&.modal_unit,
      additionalButtons:      buttons,
      unit_variation:         unit_variation(unit, fees, buttons),
      pricing_calculator_url:     unit.pricing_calculator_url,
      estimatedMonthlyRent:       estimated_monthly_rent(unit),
      estimatedMonthlyRentMax:    estimated_monthly_rent_max(unit),
      primaryImage:           primary_image,
      secondaryImage:         secondary_image,
      color:                  compute_unit_marketing_color(unit, floorplan),
      opsColor:               compute_unit_ops_color(unit),
      isFavorite:             fav_ids.include?(unit.id.to_s)
    }.merge(space_json_for(unit))
  end

  # A record's own two pictures, in the shape units and floor plans both carry
  # them. A nil slot means "this record has no such image" -- never a borrowed
  # one; deciding whether to borrow is #unit_images' job, not this one's.
  def record_images(record)
    return [nil, nil] unless record

    [
      stored_image?(record, :image) ? record.validated_image_url : nil,
      stored_image?(record, :secondary_image) ?
        record.convert_to_s3_accelerate_url(record.secondary_image.url) : nil
    ]
  end

  # Whether the record actually has a file in this slot, decided from the column
  # rather than from the uploader.
  #
  # `record.image.present?` reads like an attribute and is not: it builds the
  # mounted uploader, retrieves the stored file and walks the uploader's
  # versions. For a record with no picture that is the whole apparatus assembled
  # to arrive at nil -- and the payload asks it of every unit and then again of
  # that unit's floor plan, four slots per pair. Measured on a 671-unit
  # property it was 24ms of a 53ms unit serialization, the single largest item.
  #
  # CarrierWave stores the filename in the column, so a blank column means "no
  # file" with certainty and without constructing anything. A record that does
  # carry an image still goes through the uploader exactly as before.
  def stored_image?(record, column)
    return record.read_attribute(column).present? if record.has_attribute?(column)

    # Not every record handed to #record_images is backed by that column.
    record.public_send(column).present?
  end

  # A unit's two pictures: its own when it has any, otherwise its floor plan's.
  #
  # Whole-set, not per-slot. A unit carrying only a primary shows that one image
  # rather than borrowing the plan's secondary as its second -- a detail view
  # pages through this pair behind a single set of arrows, and filling the gap
  # from the other record puts a different apartment behind the next arrow.
  #
  # This subsumes the old `image` key, which resolved the same unit-then-plan
  # fallback but flattened it to a single URL, so a host could never show the
  # second picture or tell which record the one it got came from. Hosts read the
  # pair now; the map already resolved it this way client-side.
  def unit_images(unit, floorplan)
    own = record_images(unit)
    return own if own.any?(&:present?)

    floorplan_images(floorplan)
  end

  # A floor plan's pictures, resolved once per plan rather than once per unit.
  #
  # Most units carry no image of their own and fall back to their plan's, so
  # this ran for every unit on the property -- 671 resolutions of the same 46
  # answers, each one going through the uploader. The plans are shared by
  # definition, and nothing about the pair depends on which unit is asking.
  def floorplan_images(floorplan)
    return [nil, nil] unless floorplan

    @floorplan_images ||= {}
    @floorplan_images.fetch(floorplan.id) { @floorplan_images[floorplan.id] = record_images(floorplan) }
  end

  # The space's own letter and terms, carried on the unit itself.
  #
  # spaceConfig (on the floor plan) is what the pop-up renders; this is what lets
  # a single unit still describe itself once it is out of that context -- a
  # favourited bedroom in the favourites rail, an analytics event, and the
  # door-preferred lookup that decides which unit a letter tab acts on.
  #
  # Emitted only for a student-housing property, so every other payload is
  # unchanged.
  def space_json_for(unit)
    return {} unless @community.student_housing_property?

    detail = space_details_by_unit_id[unit.id]
    return {} unless detail

    {
      space: {
        letter:         detail.space_letter,
        isPremium:      detail.premium?,
        rent:           detail.space_rent&.to_f,
        leaseStartDate: detail.lease_start_date,
        leaseEndDate:   detail.lease_end_date,
        academicYear:   detail.academic_year_label
      }
    }
  end

  def space_details_by_unit_id
    @space_details_by_unit_id ||=
      UnitSpaceDetail.for_community(@community.id).index_by(&:unit_id)
  end

  private

  # Hands every unit the floor plan it would otherwise fetch for itself.
  #
  # Rails cannot preload this one: Unit#floorplan resolves on
  # `provider_floorplan_id`, not on our primary key, so `includes(:floorplan)`
  # joins the wrong column and the overridden reader throws the result away.
  # That left each unit doing its own SELECT — around twenty of them, because
  # every additional-button fallback re-reads the plan — which is what made
  # fetch_data cost tens of thousands of queries on a large property.
  #
  # Costs no query of its own: the controller's community loader already
  # includes `:floorplans`, so this is a walk over rows that are in memory.
  # Reuses #floorplans_by_provider_id, which the student-housing space config
  # already built for exactly this lookup.
  def attach_floorplans(units)
    by_provider_id = floorplans_by_provider_id
    units.each { |unit| unit.preloaded_floorplan = by_provider_id[unit.floorplan_id] }
  end

  # Whether this payload's `units` are rolled up by plot position: the property
  # is configured for it AND the client asked. Both are required — see #build.
  def grouped_units?
    @group_units && @community.student_housing_property?
  end

  # Ops rollup: which bedroom's status the apartment's single polygon shows when
  # its bedrooms disagree.
  #
  # An ops map colours each unit by its own unit_status, so one polygon per
  # apartment can only show one of them. Picking the base bedroom's would be
  # arbitrary — leasing state has nothing to do with which bedroom sorts first —
  # so the most actionable status wins instead: something needing a turn or a
  # lease outranks something already handled.
  #
  # Nothing is hidden by this. Every bedroom keeps its own unit_status and
  # opsColor under `spaces`, and the base carries `unitStatuses` and
  # `mixedStatus` so a door whose bedrooms disagree can be rendered as such.
  #
  # Reorder this list to change what the map emphasises; it is the only place
  # the ranking is expressed.
  OPS_STATUS_PRIORITY = %i[vacant occupied_on_notice vacant_leased occupied model].freeze

  # The only fields a space does not carry: the position, which belongs to the
  # door it is drawn on.
  #
  # Co-plotted units share a position by definition, but not always these exact
  # values — on an SVG map the shape is the anchor, and the legacy x_plot/y_plot
  # columns can still disagree between units drawn on it. Dropping them keeps
  # "only a door can be plotted" a structural guarantee rather than a
  # convention, and the SDK puts the door's position back when it hands a space
  # to a caller.
  SPACE_NEVER_KEYS = %i[x_plot y_plot pointerData mapId floor].freeze

  # A space is its unit's whole record, minus the position. Every space in a
  # group therefore has exactly the same keys as every other, and each one is
  # already the complete unit — nothing to reconstruct, nothing to look up.
  #
  # Two earlier attempts were both too clever. A hand-picked field list ("just
  # the fields that differ between bedrooms") assumed which fields those were,
  # and the assumption was wrong: co-plotted units carry different floor plans
  # in real data, so bedrooms inherited a neighbour's layout and price. A diff
  # against the door fixed the correctness but made every space a different
  # shape — one with three keys, the next with ten — which is unreadable in a
  # console and forces the reader to hold the merge rule in their head.
  #
  # The repetition this costs is the point: a space you can read on its own is
  # worth more than the bytes gzip was already collapsing.
  #
  # Takes the unit's already-serialized record so a group renders each of its
  # units exactly once, the base included.
  def space_json(unit_json)
    unit_json.except(*SPACE_NEVER_KEYS)
  end

  # What the base unit has to answer on behalf of the whole apartment: the map
  # colours it, the filters test it, and the units list shows it as a "from"
  # price. Precomputed here rather than derived in the browser so client-side
  # filtering stays O(1) per position instead of walking every bedroom.
  #
  # These overwrite the base unit's own values — the base is one bedroom, and its
  # rent or availability alone would misreport the apartment.
  def space_rollup(spaces, ops_map = false)
    available = spaces.select(&:available)
    rents     = spaces.filter_map { |u| u.get_market_rent()&.to_f }.select(&:positive?)
    sqfts     = spaces.filter_map { |u| unit_square_feet(u)&.to_i }.select(&:positive?)

    # Earliest move-in among the bedrooms a visitor could actually lease. Falls
    # back to the earliest date overall so a fully-leased apartment still shows
    # when it frees up rather than showing nothing.
    soonest = available.filter_map(&:available_date).min || spaces.filter_map(&:available_date).min
    soonest_space = (available.presence || spaces).find { |u| u.available_date == soonest }

    {
      spaceCount:           spaces.size,
      availableSpaceCount:  available.size,
      available:            available.any?,
      available_now:        available.any?(&:available_now?),
      available_date:       soonest,
      availability_bucket:  soonest_space&.availability_bucket,
      availabilityBuckets:  spaces.filter_map(&:availability_bucket).uniq,
      market_rent:          rents.min,
      priceMin:             rents.min,
      priceMax:             rents.max,
      sqftMin:              sqfts.min,
      sqftMax:              sqfts.max
    }.merge(ops_map ? ops_rollup(spaces) : {})
  end

  # What an apartment's single polygon shows on an ops map, plus enough for the
  # client to tell that the polygon is speaking for bedrooms that disagree.
  #
  # The winning bedroom decides both the colour and the status label, so the two
  # can never contradict each other. See OPS_STATUS_PRIORITY for the ranking.
  def ops_rollup(spaces)
    ranked = spaces.min_by { |unit| OPS_STATUS_PRIORITY.index(ops_status_key(unit)) || OPS_STATUS_PRIORITY.size }
    statuses = spaces.map { |unit| ops_status_key(unit) }.uniq

    {
      unit_status:  ranked.unit_status,
      opsColor:     compute_unit_ops_color(ranked),
      model_unit:   ranked.modal_unit,
      unitStatuses: statuses,
      mixedStatus:  statuses.size > 1
    }
  end

  # Square footage the same way unit_json resolves it: the unit's own value when
  # set, otherwise the floor plan's.
  def unit_square_feet(unit)
    return unit.square_feet if unit.square_feet?
    unit.floorplan&.square_feet
  end

  def property_json(show_ops_map = false)
    {
      propertyId:   @community.id,
      propertyName: @community.name,
      # Every analytics event is stamped with the owning company so a
      # multi-property client can roll their reporting up without us shipping
      # them a property-to-company mapping. Read off the already-loaded
      # community row — no association is walked.
      companyId:    @community.company_id,
      # Published on every analytics event beside the id, so a client's report
      # reads a name without keeping its own id-to-company table. The
      # controllers that build this payload preload the company.
      companyName:  @community.company&.name,
      website:      @community.community_website,

      # What this property is allowed to push into its embedding page's GTM data
      # layer. Server-driven on purpose: pyn-map-sdk-v1.js is one file every
      # client loads from our CDN, so a hardcoded list would make "expose one
      # more event for one property" a JS release and a cache bust for everyone.
      # See Analytics::MapEventContract#data_layer_config.
      analytics:    Analytics::MapEventContract.data_layer_config(@community),

      branding: {
        logoUrl:         resolve_map_logo_url(@community),
        scheduleTourUrl: @community.schedule_tour_url,
        schedulerWidget: @community.scheduler_widget,
        poweredByBtn:    @community.powered_by_btn
      },

      applyNow: apply_now_config,

      # How to read `units`. "flat" is every property today: one entry per unit.
      # "spaces" means the entries are one-per-plotted-position, each carrying its
      # leasable bedrooms under `spaces`.
      #
      # A capability, not a vertical — deliberately not a `studentHousing`
      # boolean. Clients branch on the shape they have to parse, so a
      # conventional property with co-plotted units can opt into the same rollup
      # later without a second client code path, and `key` leaves room for
      # grouping on something other than the plot once unit spaces become real
      # rows (UC 08 / PYN-1638).
      unitGrouping: {
        mode: grouped_units? ? "spaces" : "flat",
        key:  "plot"
      },

      map: {
        type:                 @community.is_sitemap ? "sitemap" : "floorplate",
        enableSvgMode:        @community.enable_svg_mode,
        isBeansSvg:           @community.is_beans_svg?,
        defaultFloor:         @community.default_map_floor,
        sitemapAutoZoom:      @community.sitemap_auto_zoom,
        enable3dMaps:         @community.enable_three_d_maps,
        # "2d" | "3d" | "both" -- the "Available map views" setting, resolved
        # against the maps this property actually has (PYN-1610). The SDK boots
        # straight into the one view when it isn't "both", and the 2D/3D
        # switcher exists only for "both".
        availableViews:       map_views,
        defaultView:          @community.resolved_default_map_view,
        defaultSatelliteView: @community.default_satellite_view,
        # "Highlight floor plan on hover" CMS toggle. On, hovering a unit lights
        # up every unit sharing its floor plan and the pop-up names the whole
        # range rather than the one unit; off is today's single-unit hover.
        # Properties that plot one tenant per floor plan across several units
        # want the group, but nothing here is specific to such a property.
        highlightAllUnitsOnHover: @community.highlight_all_units_on_hover,
        # "Hide unit numbers" CMS toggle. On, the SDK drops the number labels
        # the SVG draws inside its unit groups; the unit shapes themselves, and
        # everything they do on hover and click, are untouched.
        hideUnitNumbers:          @community.hide_map_unit_numbers
      },

      beans3dConfig: beans3d_config_json,

      unitDisplay: {
        displayRent:                  @community.display_rent,
        displayPricingOptions:        @community.display_pricing_options,
        enablePynwheelCalculator:     @community.enable_pynwheel_pricing_calculator?,
        displayBuilding:              @community.display_building,
        displayAvailableDate:         @community.display_available_date,
        displayAdditionalFee:         @community.display_additional_fee,
        # The property's own fee blob -- what #get_additional_fees returns with
        # no unit in hand. Carried here, once, rather than copied onto every
        # floor plan: it is the same markup for the whole property, and a view
        # that has no unit to ask (the student-housing space pop-up, which is
        # open on a room type before any door is chosen) has nowhere else to
        # read it from. Units keep their own `additional_fees`, which already
        # falls back to this string, so nothing about the unit pop-up changes.
        # nil whenever the toggle above is off -- get_additional_fees gates it.
        additionalFees:               @community.get_additional_fees,
        pricingMessage:               @community.pricing_message,
        hideBedrooms:                 @community.hide_bedrooms_bathrooms,
        hideSquareFeet:               @community.hide_square_feet,
        hideAvailability:             @community.hide_availability,
        unitsAvailabilityOver120Days: @community.units_availability_over_120_days,
        coloringMode:                 @community.coloring_mode
      },

      markerConfig: map_configuration(@community, show_ops_map),

      unitColors: {
        availableColor:   @community.available_units_color,
        availableOpacity: @community.available_units_opacity.to_f,
        modelColor:       @community.model_units_color,
        modelOpacity:     @community.model_units_opacity.to_f
      },

      legend: {
        showPropertyMapKey:  @community.show_property_map_key,
        propertyMapKeyText:  @community.show_property_map_key_text,
        showAmenityKey:      @community.show_amenity_key,
        amenityKeyText:      @community.show_amenity_key_text,
        showAmenityName:     @community.show_amenity_name,
        bedroomColors:       bedroom_legend_colors
      },

      marketingMode: {
        turnAvailabilityOn: @community.turn_availability_on
      },

      neighborhood: neighborhood_discovery_json,

      filters: property_filters_json(show_ops_map),

      # Names only. Whether each tab exists at all is filters.showUnitsTab and
      # friends, which the CMS keeps separately per map type; a renamed tab is
      # still the same tab, so these are one set for the property.
      tabLabels: design_system_config.to_tab_labels,

      # The icon above each of those names: which one, and whether it shows at
      # all. Same four keys as tabLabels, stored independently of them.
      tabIcons: design_system_config.to_tab_icons,

      fontFamily: @community.font_setting&.svg_labels_font_family,

      themeConfig: design_system_config.to_theme_config
    }
  end

  # "Apply Now" visibility + link mode, mirroring the old map's CMS toggle
  # (credential.apply_now: "true" | "separate_link" | "false"):
  #   - "true"          -> Apply Now shown, links to the CRM/folio apply URL
  #                        (unit.availability_url)
  #   - "separate_link" -> Apply Now shown, links to a fixed external URL
  #                        (credential.separate_link) for every unit
  #   - anything else   -> Apply Now hidden
  # separateLink is only populated in the separate_link mode.
  def apply_now_config
    mode = @community.credential&.apply_now.to_s

    case mode
    when "true"
      { enabled: true, mode: "crm", separateLink: nil }
    when "separate_link"
      { enabled: true, mode: "separate_link", separateLink: @community.credential&.separate_link }
    else
      { enabled: false, mode: "none", separateLink: nil }
    end
  end

  # Enough to render the Gallery entry point, and nothing more — the images
  # themselves come from fetch_gallery, only once the visitor opens the panel.
  # imageCount lets the host hide the button for a property that has uploaded
  # nothing.
  def gallery_discovery_json
    builder = SdkGalleryBuilderService.new(@community)

    {
      pageName:          @community.gallery_page_name.presence || SdkGalleryBuilderService::DEFAULT_PAGE_NAME,
      displayOnHomepage: @community.display_gallery_on_homepage,
      imageCount:        builder.image_count
    }
  end

  # Same contract as gallery_discovery_json: enough to render the page and draw
  # the map, nothing that costs a query per row. The curated pins come
  # from fetch_neighborhood and the live places from fetch_neighborhood_places,
  # both only once the visitor opens the panel.
  def neighborhood_discovery_json
    SdkNeighborhoodBuilderService.new(@community).discovery_json
  end

  # The CMS keeps two independent sets of these toggles -- one for the marketing
  # map, one for the ops map -- so which set to read is decided by `ops_map`, not
  # by which one happens to be the default. Passing `false` unconditionally, as
  # this used to, made an ops map wear the marketing map's tabs and filters: a
  # property with the Units tab turned off for marketing lost it on ops too, even
  # though the ops toggle right beside it was on.
  def property_filters_json(ops_map = false)
    return {} unless @community.map_filter

    filter_list = @community.map_filter.get_filter_list(ops_map)
    tab_list    = @community.map_filter.get_tab_visibility_list(ops_map)
    {
      showBedroomFilter:         filter_list[:show_bedroom_filter],
      showPricingFilter:         filter_list[:show_pricing_filter],
      showSquareFeetFilter:      filter_list[:show_square_feet_filter],
      showAvailabilityFilter:    filter_list[:show_availability_filter],
      showPropertiesFilter:      filter_list[:show_properties_filter],
      showUnitsTab:              tab_list[:show_units_tab],
      showFloorPlansTab:         tab_list[:show_floorplans_tab],
      showAmenitiesTab:          tab_list[:show_amenities_tab],
      showFavsTab:               tab_list[:show_favorites_tab],
      # "Show sort options" CMS toggle. Hides the right-rail "Sort By" control on
      # the units & floor-plans lists; the lists then fall back to their default
      # order. Independent of the pricing/availability display toggles, which only
      # decide WHICH sort options are offered when the control is shown.
      showSortOptions:           @community.map_filter.show_sort_options?(ops_map),
      # "Enable Floor Plan Gallery Page" CMS toggle. Gates the map's "View All
      # Floor Plans" button, which opens the full floor-plan gallery listing
      # page. Off means visitors browse floor plans on the map only; it does not
      # touch showFloorPlansTab, which decides whether the list exists at all.
      showFloorPlanGalleryPage:  @community.map_filter.show_floorplan_gallery_page?(ops_map)
    }
  end

  # Two blocks of the property payload read this (themeConfig and tabLabels),
  # and a property that has never had its Custom Design page opened has no row —
  # hence the unsaved instance, which answers with DEFAULT_CONFIG.
  def design_system_config
    @design_system_config ||= @community.design_system_config || DesignSystemConfig.new
  end

  def resolve_map_logo_url(community)
    logo = community.map_logo.presence || community.logo.presence
    return nil if logo.blank?
    logo.respond_to?(:url) ? logo.url : logo.to_s
  end

  # Beans-generated maps render the static base map (parking, buildings,
  # landscaping) as a single background image, with the interactive
  # sitemap/floorplate SVGs (units only, transparent) overlaid on top — for
  # floorplates every floor SVG overlays this same background. The SDK renders
  # it as an <img>, so we hand back the resolved image URL directly.
  def map_views
    @map_views ||= @community.resolved_map_views
  end

  def map_view_2d?
    map_views != "3d"
  end

  def map_view_3d?
    map_views != "2d"
  end

  # A 2D-only map never starts Beans, so it gets no key and no 3D styling to
  # look up. show3dByDefault opens the map in 3D: always for a 3D-only map, and
  # for "both" when the property's "Default map view" is 3D.
  def beans3d_config_json
    return { enabled: false } unless map_view_3d?

    {
      enabled:              true,
      show3dByDefault:      @community.resolved_default_map_view == "3d",
      beansApiKey:          ENV['BEANS_API_KEY'].to_s,
      defaultSatelliteView: @community.default_satellite_view,
      propertyAddress:      [@community.address, @community.city, @community.state, @community.zip].compact.join(', '),
      mapConfig:            @community.three_d_maps_configuration&.as_json || {}
    }
  end

  def background_svg_json
    return nil unless map_view_2d?
    return nil unless @community&.is_beans_svg?
    return nil unless @community.background_svg_image.present?

    {
      imageUrl:  @community.validated_background_svg_image_url,
      updatedAt: @community.updated_at.to_i
    }
  end

  def sitemap_json
    return nil unless @community&.is_sitemap?
    sitemap = @community.sitemap
    return nil unless sitemap

    json = {
      mapId:       sitemap.id,
      mapType:     'sitemap',
      updatedAt:   sitemap.updated_at.to_i
    }
    return json unless map_view_2d?

    width, height = sitemap_dimensions(sitemap)
    json.merge(imageUrl: sitemap.validated_image_url, imageWidth: width, imageHeight: height)
  end

  # [width, height] for the sitemap image, preferring the columns and falling
  # back to the file exactly as this used to.
  #
  # The columns default to 0 rather than NULL, so `> 0` was false for every
  # sitemap that had never had its size recorded and both branches fell through
  # to `image.width` / `image.height` -- two separate S3 downloads and two full
  # ImageMagick decodes, on every payload build, for every sitemap property.
  # StoredImageDimensions makes that one decode, and writes the answer to the
  # columns so it does not happen again.
  #
  # Same values as before, including the 0 a property with no artwork gets.
  def sitemap_dimensions(sitemap)
    stored = [sitemap.try(:width).to_i, sitemap.try(:height).to_i]
    return stored if stored.all?(&:positive?)
    return stored unless sitemap.image.present?

    decoded = sitemap.stored_image_dimensions
    [stored[0].positive? ? stored[0] : decoded[0].to_i,
     stored[1].positive? ? stored[1] : decoded[1].to_i]
  rescue => e
    Rails.logger.warn("[sdk] sitemap #{sitemap.id} dimensions unavailable: #{e.class}: #{e.message}")
    [sitemap.try(:width).to_i, sitemap.try(:height).to_i]
  end

  def floorplates_json
    return [] if @community.is_sitemap?
    @community.floorplates.map do |fp|
      {
        mapId:          fp.id,
        mapType:        'floorplate',
        name:           fp.name,
        range:          fp.range,
        # { "floor" => label } — what each floor is called in the floor list,
        # decided here by Floorplate#floor_label so the new map's labels come from
        # the same rule as the old map's and the SDK only has to look them up.
        floorLabels:    floor_labels_for(fp),
        floorName:      fp.floor_name,
        floorNameAdded: fp.floor_name_added,
        updatedAt:      fp.updated_at.to_i
      }.merge(floorplate_image_json(fp))
    end
  end

  # A 3D-only map still needs each floorplate for its floor list, but never
  # draws the artwork -- so skip the URL and the dimension lookups behind it.
  def floorplate_image_json(fp)
    return {} unless map_view_2d?

    {
      imageUrl:    fp.validated_image_url,
      imageWidth:  fp.floorplate_image_width.to_i,
      imageHeight: fp.floorplate_image_height.to_i
    }
  end

  # Floorplate#floors cannot parse a blank range, so such a floorplate sends no
  # labels and the SDK falls back to floor numbers.
  def floor_labels_for(floorplate)
    return {} if floorplate.range.blank?

    floorplate.floors.each_with_object({}) do |floor, labels|
      labels[floor.to_s] = floorplate.floor_label(floor)
    end
  end

  def floorplans_json(units_ar = nil, fav_ids = Set.new)
    units              = units_ar || @community.units
    units_by_floorplan = units.group_by(&:floorplan_id)
    space_configs      = space_configs_by_floorplan(units)

    @community.floorplans.map do |fp|
      fp_units   = units_by_floorplan[fp.id] || []
      first_unit = fp_units.find(&:available) || fp_units.first

      fp_primary_image, fp_secondary_image = record_images(fp)

      json = {
        floorplanId:       fp.id,
        # The PMS's id, published by analytics as `floor_plan_id` for the same
        # reason units carry theirs. Already read below for spaceConfig.
        providerFloorplanId: fp.provider_floorplan_id,
        name:              fp.name,
        bedrooms:          fp.bedrooms,
        bathrooms:         fp.bathrooms,
        market_rent:       fp.market_rent,
        square_feet:       fp.square_feet,
        description:       fp.description.presence,
        description_title: floorplan_description_title(fp),
        showDescriptionOnCard: show_floorplan_description_on_card?(fp),
        expandDescriptionInPopup: expand_description_in_popup?(fp),
        additionalButtons: floorplan_additional_buttons(fp),
        availability_url: floorplan_apply_url(fp, first_unit),
        availability_status: fp.availability_status,
        primaryImage:     fp_primary_image,
        secondaryImage:   fp_secondary_image,
        color:            compute_floorplan_color(fp),
        isFavorite:       fav_ids.include?(fp.id.to_s)
      }

      config = space_configs[fp.provider_floorplan_id]
      config ? json.merge(spaceConfig: config) : json
    end
  end

  # The Apply Now link a floor-plan card and the space pop-up open.
  #
  # On a student-housing property this is deliberately the floor plan's **own**
  # URL and never a unit's or a space's. Students lease a bed of a room type, not
  # an apartment -- the property assigns the actual unit at signing -- so a
  # per-space deep link would send an applicant at a specific bedroom the leasing
  # office has not promised them. `separate_link` still wins, the way it does for
  # every other Apply Now in the map.
  #
  # Every other property keeps exactly the behaviour it has today.
  def floorplan_apply_url(fp, first_unit)
    return first_unit&.get_availability_url() unless @community.student_housing_property?

    credential = @community.credential
    return credential.separate_link if credential&.apply_now.to_s == "separate_link"

    fp.availability_url.presence
  end

  # The floor-plan-scoped tab set the student-housing pop-up renders: one entry
  # per space letter, each carrying its own availability, premium chips, rent and
  # lease dates.
  #
  # Returns {} for every property but a student-housing one whose feed named
  # letters. This is the single place the toggle is checked -- the import never
  # asks about it, and the clients branch on whether spaceConfig is present.
  #
  # Floor-plan-scoped rather than unit-scoped because a room type is a property of
  # the floor plan: the specific apartment is assigned at signing, so the pop-up
  # never names a unit. Precomputed here rather than derived in the browser so
  # opening the modal costs an array index, not a scan over a thousand units.
  # The only two things this needs from a space's unit, carried along on the
  # join instead of fetched as a whole record.
  #
  # It used to `includes(:unit)`, which instantiated every unit on the property
  # a second time -- the payload already holds them all -- so that two
  # attributes could be read off each one. On a 671-bed property that was 87% of
  # the time spent building the floor plans.
  #
  # INNER JOIN rather than LEFT is deliberate and changes nothing: a detail row
  # whose unit is gone used to resolve to a nil floorplan_id and was dropped by
  # the `.except(nil)` below, so the join drops exactly the same rows.
  SPACE_UNIT_COLUMNS =
    "units.floorplan_id AS unit_floorplan_id, units.marketing_name AS unit_marketing_name".freeze

  def space_configs_by_floorplan(units)
    return {} unless @community.student_housing_property?

    details = UnitSpaceDetail.for_community(@community.id).lettered
                             .joins(:unit)
                             .select("unit_space_details.*", SPACE_UNIT_COLUMNS)
                             .to_a
    return {} if details.empty?

    # The units this payload actually carries. Deliberately NOT the same source as
    # the tab set: map_units narrows to available units whenever
    # turn_availability_on is false, so a letter whose spaces are all leased is
    # absent here -- and deriving tabs from it would make a 4-bed apartment show
    # three room types. Tabs come from the detail rows; only the counts and the
    # actionable unit id come from the payload.
    payload_units = units.index_by(&:id)

    details.group_by(&:unit_floorplan_id)
           .except(nil)
           .map { |provider_id, rows|
             [provider_id,
              {
                # The payload carries two different floor-plan id spaces, and a
                # client holding a unit only has the second one:
                #   floorplans[].floorplanId -> our Floorplan primary key
                #   units[].floorplanId      -> the PMS's own id (provider_floorplan_id)
                # Carrying it here lets the SDK index this block under both, so a
                # unit resolves its tab set without falling back to name matching
                # the way floorPlanUtils has to.
                providerFloorplanId: provider_id,
                letters: letters_json(rows, payload_units, floorplans_by_provider_id[provider_id])
              }]
           }.to_h
  end

  def letters_json(rows, payload_units, floorplan = nil)
    rows.group_by(&:space_letter).sort_by(&:first).map do |letter, group|
      # Stable across syncs: ordered by the same natural key SdkUnitSpaceGrouper
      # elects a base unit with. Deliberately not "first available" -- availability
      # flips as leases are signed, and this id is what favourites, deep links and
      # analytics are keyed on.
      ordered = group.sort_by { |d| [SdkUnitSpaceGrouper.natural_key(d.unit_marketing_name), d.unit_id.to_i] }
      display = ordered.first
      present = ordered.filter_map { |d| payload_units[d.unit_id] }

      # The unit a tab acts on. The display representative when the payload carries
      # it, otherwise any of that letter's units that it does carry, otherwise nil
      # -- an id outside units[] resolves to nothing in the browser, and a dangling
      # id is worse than an absent one. A nil here still renders a "0 spaces
      # available" tab; it just falls back to the floor plan's apply URL.
      actionable = payload_units[display.unit_id] || present.first
      available  = present.select(&:available)

      {
        letter:           letter,
        # The only aggregates, and the only fields read from the payload's units:
        # `available` already honours sold, manual_override and the CMS's
        # availability_is_updated, where raw VacancyClass would not.
        availableCount:   available.size,
        totalCount:       group.size,
        # When this letter's first bed frees up. The earliest move-in across the
        # letter's own free spaces, which is what "when could I move in" means for
        # a room type nobody has been assigned a specific apartment in yet. nil
        # when the letter is fully leased -- the client then renders the status
        # alone rather than an availability date that belongs to nothing.
        availableDate:    earliest_available_date(available),
        availabilityStatus: letter_availability_status(available.size, floorplan),
        isPremium:        display.premium?,
        premiumAmenities: display.premium_amenities,
        rent:             display.space_rent&.to_f,
        leaseStartDate:   display.lease_start_date,
        leaseEndDate:     display.lease_end_date,
        academicYear:     display.academic_year_label,
        # Deliberately no per-letter applyUrl. Apply Now on a student-housing
        # property is always the floor plan's link -- floorplans[].availability_url
        # -- because the applicant is choosing a room type, not an apartment. See
        # floorplan_apply_url.
        representativeUnitId: actionable&.id
      }
    end
  end

  # The soonest a visitor could move into this letter, or nil when none of its
  # spaces are free. Year-zero dates are the importers' "no date" sentinel --
  # Unit#available_now? reads them as available now -- so they are dropped rather
  # than serialized as 0000-01-01.
  def earliest_available_date(available_units)
    available_units.filter_map { |u| u.available_date if u.available_date&.year.to_i > 1 }.min
  end

  # The badge the pop-up shows for the selected letter.
  #
  # Anchored to the floor plan's own CMS status rather than derived from a ratio:
  # `availability_status` is a dropdown a property manager sets deliberately, and
  # inventing "Almost Gone" from a percentage would overrule them with a threshold
  # nobody agreed to. The one thing the letter knows better than the floor plan is
  # whether *it* has anything left, so that is the only specialisation:
  #
  #   no free spaces of this letter  -> sold_out, whatever the plan says
  #   free spaces of this letter     -> the plan's status, but never sold_out
  def letter_availability_status(available_count, floorplan)
    status = floorplan&.availability_status

    return "sold_out" if available_count.zero?
    return "available" if status.blank? || status == "sold_out"

    status
  end

  def floorplans_by_provider_id
    @floorplans_by_provider_id ||= @community.floorplans.index_by(&:provider_floorplan_id)
  end

  def amenities_json(fav_ids = Set.new)
    amenity_color_cfg = amenity_marker_config(@community)
    svg_enabled = @community.enable_svg_mode

    Amenity
      .where(community_id: @community.id)
      .plotted_amenities(svg_enabled)
      .includes(:amenity_galleries)
      .order(:sort)
      .map do |a|
        {
          amenityId:        a.id,
          name:             a.name,
          description:      a.description.presence,
          amenityType:      a.amenty_type,
          image:            a.validated_image_url,
          directionalText:  a.directional_text.presence,
          colorConfig:      amenity_color_cfg,
          x_plot:           a.x_plot.to_i,
          y_plot:           a.y_plot.to_i,
          floor:            a.floor,
          floorplateId:     a.amenityable_id,
          pointerData:      a.pointer_data,
          isFavorite:       fav_ids.include?(a.id.to_s),
          additionalButtons: amenity_additional_buttons(a),
          additionalImages: a.amenity_galleries.map { |g|
            {
              name:        g.name.presence,
              description: g.description.presence,
              image:       g.image.present? ? a.convert_to_s3_accelerate_url(g.image.url) : nil
            }
          }
        }
      end
  end

  def filters_json(units_ar = nil, ops_map = false)
    units = units_ar || @community.units.map_units(@community, ops_map).visible_units.without_hidden_names.includes(:floorplan)

    {
      bedrooms:      filter_bedroom_options(units),
      availability:  filter_availability_options(units, ops_map),
      squareFootage: filter_square_footage_data(units),
      priceRange:    filter_price_range_data(units),
      visibility:    property_filters_json(ops_map),
      displayFlags: {
        displayRent:      @community.display_rent,
        hideBedrooms:     @community.hide_bedrooms_bathrooms,
        hideSquareFeet:   @community.hide_square_feet,
        hideAvailability: @community.hide_availability
      }
    }
  end

  def compute_unit_marketing_color(unit, floorplan)
    is_model = unit.modal_unit

    if @community.by_floorplan? && floorplan.present?
      color   = is_model ? floorplan.model_units_color   : floorplan.available_units_color
      opacity = is_model ? floorplan.model_units_opacity : floorplan.available_units_opacity
    elsif @community.by_bedroom? && floorplan.present?
      bmc = bedroom_marker_colors_map[floorplan.bedrooms.to_i]
      if bmc
        color   = is_model ? bmc.model_units_color   : bmc.available_units_color
        opacity = is_model ? bmc.model_units_opacity : bmc.available_units_opacity
      else
        color   = is_model ? @community.model_units_color   : @community.available_units_color
        opacity = is_model ? @community.model_units_opacity : @community.available_units_opacity
      end
    else
      color   = is_model ? @community.model_units_color   : @community.available_units_color
      opacity = is_model ? @community.model_units_opacity : @community.available_units_opacity
    end

    { color: color, opacity: opacity.to_f }
  end

  # Which colour bucket a unit's raw PMS status falls into. Extracted from
  # compute_unit_ops_color so the ops rollup can rank a group's bedrooms by
  # status without re-deriving the mapping and letting the two drift.
  # Every status string either map knows, and the colour bucket it belongs to.
  # A lookup rather than a case so the same table can be tried against more than
  # one column without repeating the vocabulary -- see #ops_status_key.
  OPS_STATUS_BY_VALUE = {
    "occupied"                  => :occupied,
    "occupied no notice"        => :occupied,
    "notice rented"             => :occupied,
    "occupied on notice"        => :occupied_on_notice,
    "notice unrented"           => :occupied_on_notice,
    "vacant"                    => :vacant,
    "available"                 => :vacant,
    "unoccupied"                => :vacant,
    "vacant unrented not ready" => :vacant,
    "vacant unrented ready"     => :vacant,
    "vacant lease"              => :vacant_leased,
    "vacant rented"             => :vacant_leased,
    "vacant rented ready"       => :vacant_leased,
    "vacant rented not ready"   => :vacant_leased
  }.freeze

  # Which colour bucket a unit falls into on an ops map, in order of how much the
  # value can be trusted:
  #
  #   1. `availability`, but only where a person pinned it -- see
  #      #pinned_availability. A hand-set value outranks anything the feed says.
  #   2. `unit_status` -- the PMS status string, when the feed sends one we know.
  #      Preferred over plain `availability` because it is the richer answer:
  #      six operational buckets rather than occupied/not.
  #   3. `availability` unpinned -- the CMS's own two-value control ("Occupied" /
  #      "Unoccupied"), which is all a hand-managed property has. Flagging a unit
  #      sold writes "Occupied" here too, which is the app's own rule rather than
  #      noise: sold means leased, and leased means occupied. Also catches a
  #      real-but-unmapped unit_status like "Waitlist", which lands here rather
  #      than being thrown away.
  #   4. Nothing -- so say nothing. :missing is what the "Missing Data" legend
  #      entry is for, and it is the only honest answer when no column reports
  #      anything.
  #
  # That last branch used to be :vacant, which put a confident "every door is
  # empty" on a property whose feed simply carries no status. It is reachable now
  # in a way it was not before: such units used to be dropped from the ops map
  # entirely by the status whitelist in Unit.map_units.
  def ops_status_key(unit)
    return :model if unit.modal_unit

    OPS_STATUS_BY_VALUE[pinned_availability(unit)] ||
      OPS_STATUS_BY_VALUE[unit.unit_status.to_s.downcase.strip] ||
      OPS_STATUS_BY_VALUE[unit.availability.to_s.downcase.strip] ||
      :missing
  end

  # `availability` when a person set it by hand, and nothing otherwise.
  #
  # `availability_is_updated` is the app's own "pinned, the feed must not
  # overwrite this" marker (Unit::FEED_OVERRIDE_FLAGS). Nothing pins
  # `unit_status`, so once staff correct a unit's availability the two columns
  # drift apart for good: the feed keeps rewriting its status while the corrected
  # availability stays put. Real example -- a Yardi unit reading "Occupied No
  # Notice" whose pinned availability, units grid and marketing map all say it is
  # available now.
  #
  # The pinned value is a person's deliberate correction of exactly this data, so
  # it outranks the column the feed is still overwriting.
  def pinned_availability(unit)
    return nil unless unit.availability_is_updated?

    unit.availability.to_s.downcase.strip
  end

  def compute_unit_ops_color(unit)
    { color: status_colors[ops_status_key(unit)], opacity: 1.0 }
  end

  def compute_floorplan_color(fp)
    if @community.by_floorplan?
      { color: fp.available_units_color, opacity: fp.available_units_opacity.to_f }
    elsif @community.by_bedroom?
      bmc = bedroom_marker_colors_map[fp.bedrooms.to_i]
      bmc ? { color: bmc.available_units_color, opacity: bmc.available_units_opacity.to_f }
          : { color: @community.available_units_color, opacity: @community.available_units_opacity.to_f }
    else
      { color: @community.available_units_color, opacity: @community.available_units_opacity.to_f }
    end
  end

  def bedroom_marker_colors_map
    @bedroom_marker_colors_map ||= @community.bedroom_marker_colors.index_by(&:bedroom)
  end

  def bedroom_legend_colors
    return [] unless @community.by_bedroom?

    bedroom_marker_colors_map.values.sort_by(&:bedroom).map do |bmc|
      label = bmc.bedroom == 0 ? "Studio" : "#{bmc.bedroom} Bedroom#{'s' if bmc.bedroom > 1}"
      {
        bedroom:          bmc.bedroom,
        label:            label,
        availableColor:   bmc.available_units_color,
        availableOpacity: bmc.available_units_opacity.to_f,
        modelColor:       bmc.model_units_color,
        modelOpacity:     bmc.model_units_opacity.to_f
      }
    end
  end

  def status_colors
    @status_colors ||= begin
      c = status_based_default_colors(@community)
      {
        vacant:             c[:vacant],
        occupied:           c[:occupied],
        occupied_on_notice: c[:occupied_on_notice],
        vacant_leased:      c[:vacant_leased],
        model:              c[:model],
        missing:            c[:missing]
      }
    end
  end

  def map_for_unit(unit)
    return @community.sitemap&.id if @community.is_sitemap?
    map_id_by_floor[unit.floor.to_i]
  end

  # floor number -> floorplate id, built once for the property.
  #
  # Community#floorplate_for_floor rescans every floorplate on each call and
  # re-parses its `range` string into a floor array while doing so. On a 27-floor
  # property with a four-figure unit list that is tens of thousands of range
  # parses for an answer that only ever depends on the floor number.
  #
  # Walks the floorplates in association order (number DESC) and lets the first
  # one claiming a floor keep it, which is the same one #detect returned.
  def map_id_by_floor
    @map_id_by_floor ||= @community.floorplates.each_with_object({}) do |fp, map|
      next if fp.range.blank?
      fp.floors.each { |floor| map[floor] ||= fp.id }
    end
  end

  # `slot` and `kind` exist because of the select on the last line.
  #
  # These are three fixed CMS link slots and the select drops the empty ones, so
  # a property that fills only slots 2 and 3 hands the client an array whose
  # first entry is slot 2 with nothing saying so. Analytics could not report
  # "additional link 1 vs 2 vs 3" (PYN-1655's link_index), and a Schedule Tour
  # click was indistinguishable from a 3D Tour click once both were merely "the
  # button at index 0".
  #
  # `kind` is the stable identity, `slot` the CMS position. Neither is derived
  # from the label, which is free text an operator renames at will.
  def unit_additional_buttons(unit)
    [
      { label: unit.get_virtual_tour_label,      url: unit.get_virtual_tour_url,      openInNewTab: unit.link1_open_in_new_tab?, slot: 1, kind: "virtual_tour" },
      { label: unit.get_additional_button_label, url: unit.get_additional_button_url, openInNewTab: unit.link2_open_in_new_tab?, slot: 2, kind: "additional" },
      { label: unit.get_schedule_tour_label,     url: unit.get_schedule_tour_url,     openInNewTab: unit.link3_open_in_new_tab?, slot: 3, kind: "schedule_tour" }
    ].select { |btn| btn[:url].present? }
  end

  # Same three links the unit modal gets, read straight off the floorplan. Unit#get_*
  # falls back to its floorplan, so a floorplan-level link already reaches the unit
  # modal; this is that same data for the floorplan card, which has no unit to inherit
  # from. Note the column is link1_open_new_tab here — the "_in_" spelling is the
  # Unit predicate method, not a floorplan column.
  def floorplan_additional_buttons(fp)
    [
      { label: fp.virtual_tour_button_label.presence || "3D Tour",
        url: fp.virtual_tour_url, openInNewTab: fp.virtual_tour_url.present? && fp.link1_open_new_tab,
        slot: 1, kind: "virtual_tour" },
      { label: fp.additional_button.presence || "Additional Button",
        url: fp.additional_url,   openInNewTab: fp.additional_url.present?   && fp.link2_open_new_tab,
        slot: 2, kind: "additional" },
      { label: fp.scheduler_label.presence || "Scheduled Tour",
        url: fp.scheduler_url,    openInNewTab: fp.scheduler_url.present?    && fp.link3_open_new_tab,
        slot: 3, kind: "schedule_tour" }
    ].select { |btn| btn[:url].present? }
  end

  # The amenity's virtual tour link, in the same {label, url, openInNewTab} shape
  # units and floor plans use, so the host renders it with the same component.
  # Label falls back to "3D Tour" exactly as the old map does
  # (webpages/_amenities_slider.html.haml), and the tour always opens in-page:
  # the old map only ever showed it inside its own modal.
  def amenity_additional_buttons(amenity)
    return [] if amenity.video_link.blank?

    [{
      label:        amenity.video_link_button_label.presence || "3D Tour",
      url:          amenity.video_link,
      openInNewTab: false,
      # An amenity has one link, not three slots, but it carries the same two
      # fields so a single analytics helper reads every button the map renders.
      slot:         1,
      kind:         "virtual_tour"
    }]
  end

  def unit_variation(unit, additional_fees, buttons = nil)
    is_model_unit      = unit.modal_unit
    buttons            = buttons || unit_additional_buttons(unit)
    has_links          = buttons.any?
    has_one_link       = (buttons.count === 1)
    has_multiple_links = buttons.length > 1
    has_fees           = additional_fees.present?
    has_lease_pricing  = unit.lease_pricing.present? && unit.community.display_pricing_options
    display_rent       = unit.community.display_rent

    return 6 if is_model_unit && display_rent && has_lease_pricing && has_fees && has_links
    return 5 if is_model_unit && display_rent && has_fees && has_links
    return 1 if is_model_unit && has_lease_pricing && has_fees && has_links

    return 2 if !is_model_unit && !has_links && has_lease_pricing && !has_fees
    return 3 if !is_model_unit && has_lease_pricing && has_multiple_links && !has_fees
    return 4 if !is_model_unit && has_one_link && !has_fees

    1
  end

  def filter_bedroom_options(units)
    counts = units.map do |unit|
      raw = unit.floorplan&.bedrooms.to_s.strip.downcase
      (raw.blank? || raw == "studio" || raw == "0") ? 0 : raw.to_i
    end

    counts.uniq.sort.map do |n|
      if n == 0    then { label: "Studio",        value: "0" }
      elsif n == 1 then { label: "1 Bedroom",     value: "1" }
      else              { label: "#{n} Bedrooms", value: n.to_s }
      end
    end
  end

  DEFAULT_DESCRIPTION_TITLE = "More Details".freeze

  # Description, its heading and its "Expand details in pop-ups" flag, taken
  # together from whichever record supplies the description. Reading the title
  # independently would let a unit's description_title column default ("More
  # Details") mask the heading a floorplan-level special was given, since the column
  # is never nil for rows created with that default. The flag follows the same
  # rule: a unit showing its floor plan's Details opens them the way the floor plan
  # was set to, and a unit with Details of its own answers for them itself.
  def description_fields(unit, floorplan)
    source = if unit.description.present?
               unit
             elsif floorplan&.description.present?
               floorplan
             end
    return ["", DEFAULT_DESCRIPTION_TITLE, false] unless source

    [
      source.description,
      source.description_title.presence || DEFAULT_DESCRIPTION_TITLE,
      expand_description_in_popup?(source)
    ]
  end

  # Only meaningful next to a description, so it stays nil when there is none —
  # otherwise the column default ("More Details") would hand the SDK a heading for
  # an empty body.
  def floorplan_description_title(fp)
    return nil if fp.description.blank?
    fp.description_title.presence || DEFAULT_DESCRIPTION_TITLE
  end

  # The per-floor-plan "Show on cards" toggle: whether the Details body is also
  # drawn as preview text on the right-rail card, instead of only inside the
  # pop-up. Off by default, so a property that never touches the toggle keeps the
  # card it has today.
  #
  # Reported as false when there is no description, the same way the title above
  # goes nil — an "on" flag with an empty body would have the card reserve room
  # for text that never arrives.
  def show_floorplan_description_on_card?(fp)
    return false if fp.description.blank?
    fp.show_description_on_card == true
  end

  # The per-record "Expand details in pop-ups" toggle, on floor plans and units
  # alike: whether the pop-up opens with the Details body already showing, with
  # no accordion chevron, instead of collapsed under its heading. Off by default,
  # so a property that never touches it keeps the collapsible Details it has today.
  #
  # Independent of "Show on cards" above -- that one governs the right-rail card,
  # this one the pop-up. False when there is no description, since there is
  # nothing to expand.
  def expand_description_in_popup?(record)
    return false if record.description.blank?
    record.expand_description_in_popup == true
  end

  AVAILABILITY_FILTER_LABELS = {
    "now"     => "Now",
    "0-30"    => "This Month",
    "31-60"   => "In 31-60 days",
    "61-90"   => "In 61-90 days",
    "91-120"  => "In 91-120 days",
    "121+"    => "In 121+ days"
  }.freeze

  # Built from the same Unit#availability_bucket the units themselves carry, so an
  # option can only appear when at least one unit actually matches it.
  # `units_availability_over_120_days` is a marketing decision -- how far out a
  # prospect is shown move-in dates. An ops map is looking at the whole book, so
  # it keeps the far-out bucket whatever that toggle says, matching the old map
  # (`units_availability_over_120_days || opsMapMarkersEnabled` in webpages.js).
  def filter_availability_options(units, ops_map = false)
    buckets = units.filter_map(&:availability_bucket).uniq
    buckets.delete("121+") unless @community.units_availability_over_120_days || ops_map

    order = AVAILABILITY_FILTER_LABELS.keys
    buckets.sort_by { |bucket| order.index(bucket) || 99 }
           .map { |bucket| { label: AVAILABILITY_FILTER_LABELS[bucket], value: bucket } }
  end

  def filter_square_footage_data(units)
    values = units.filter_map do |u|
      sqft = u.square_feet? ? u.square_feet.to_i : u.floorplan&.square_feet.to_i
      sqft&.positive? ? sqft : nil
    end.uniq.sort
    { min: values.first, max: values.last, values: values }
  end

  def filter_price_range_data(units)
    values = units.map { |u| u.get_market_rent.to_i }.select(&:positive?).uniq.sort
    { min: values.first, max: values.last, values: values }
  end

  def estimated_monthly_rent(unit)
    return nil unless @community.enable_pynwheel_pricing_calculator?
    unit.pyn_estimated_monthly
  end

  def estimated_monthly_rent_max(unit)
    return nil unless @community.enable_pynwheel_pricing_calculator?
    min = unit.pyn_estimated_monthly
    max = unit.pyn_estimated_monthly_max
    min != max ? max : nil
  end

  # Exposed for get_favorites, which builds favorited amenities/floorplans
  # directly (mirrors the already-public units_json).
  public :amenities_json, :floorplans_json
end
