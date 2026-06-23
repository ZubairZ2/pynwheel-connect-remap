class SdkPayloadBuilderService
  include ApplicationHelper
  include CommunitiesHelper

  def initialize(community)
    @community = community
  end

  def build(ops_map: false)
    units_ar = @community.units.map_units(@community, ops_map).includes(:floorplan).to_a
    units_ar.each { |u| u.association(:community).target = @community }
    all_units = units_json(Set.new, ops_map, units_ar)

    {
      property:    property_json(ops_map),
      sitemap:     sitemap_json,
      backgroundSvg: background_svg_json,
      floorplates: floorplates_json,
      units:       all_units,
      floorplans:  floorplans_json(units_ar),
      amenities:   amenities_json,
      filters:     filters_json(units_ar),
      status:      "success",
      code:        200
    }
  end

  def units_json(fav_ids = Set.new, ops_map = false, units_ar = nil)
    units = units_ar || @community.units.map_units(@community, ops_map).includes(:floorplan)
    units&.map do |unit|
      floorplan = unit.floorplan
      fees      = @community.get_additional_fees(unit)
      buttons   = unit_additional_buttons(unit)

      {
        unitNumber:      unit.marketing_name,
        mapId:           map_for_unit(unit),
        unitId:          unit.id,
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
        floorplanName:          floorplan&.name,
        pointerData:            unit.pointer_data,
        market_rent:            unit.get_market_rent(),
        availability:           unit.availability,
        availability_url:       unit.get_availability_url(),
        available_date:         unit.available_date,
        available:              unit.available,
        lease_term:             unit.lease_term,
        lease_pricing:          unit.get_lease_term_pricing_matrix(),
        description:            unit.description.present? ? unit.description : floorplan&.description.presence || "",
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
        image:                  unit.validated_image_url || floorplan&.validated_image_url || floorplan&.secondary_image&.url.presence,
        color:                  compute_unit_marketing_color(unit, floorplan),
        opsColor:               compute_unit_ops_color(unit),
        isFavorite:             fav_ids.include?(unit.id.to_s)
      }
    end
  end

  private

  def property_json(show_ops_map = false)
    {
      propertyId:   @community.id,
      propertyName: @community.name,
      website:      @community.community_website,

      branding: {
        logoUrl:         resolve_map_logo_url(@community),
        scheduleTourUrl: @community.schedule_tour_url,
        schedulerWidget: @community.scheduler_widget,
        poweredByBtn:    @community.powered_by_btn
      },

      map: {
        type:                 @community.is_sitemap ? "sitemap" : "floorplate",
        enableSvgMode:        @community.enable_svg_mode,
        isBeansSvg:           @community.is_beans_svg?,
        defaultFloor:         @community.default_map_floor,
        sitemapAutoZoom:      @community.sitemap_auto_zoom,
        enable3dMaps:         @community.enable_three_d_maps,
        defaultSatelliteView: @community.default_satellite_view
      },

      beans3dConfig: {
        enabled:              @community.enable_three_d_maps,
        beansApiKey:          ENV['BEANS_API_KEY'].to_s,
        defaultSatelliteView: @community.default_satellite_view,
        propertyAddress:      [@community.address, @community.city, @community.state, @community.zip].compact.join(', '),
        mapConfig:            @community.three_d_maps_configuration&.as_json || {}
      },

      unitDisplay: {
        displayRent:                  @community.display_rent,
        displayPricingOptions:        @community.display_pricing_options,
        enablePynwheelCalculator:     @community.enable_pynwheel_pricing_calculator?,
        displayBuilding:              @community.display_building,
        displayAvailableDate:         @community.display_available_date,
        displayAdditionalFee:         @community.display_additional_fee,
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

      filters: property_filters_json,

      fontFamily: @community.font_setting&.svg_labels_font_family,

      themeConfig: (@community.design_system_config || DesignSystemConfig.new).to_theme_config
    }
  end

  def property_filters_json
    return {} unless @community.map_filter

    filter_list = @community.map_filter.get_filter_list(false)
    tab_list    = @community.map_filter.get_tab_visibility_list(false)
    {
      showBedroomFilter:      filter_list[:show_bedroom_filter],
      showPricingFilter:      filter_list[:show_pricing_filter],
      showSquareFeetFilter:   filter_list[:show_square_feet_filter],
      showAvailabilityFilter: filter_list[:show_availability_filter],
      showPropertiesFilter:   filter_list[:show_properties_filter],
      showUnitsTab:           tab_list[:show_units_tab],
      showFloorPlansTab:      tab_list[:show_floorplans_tab],
      showAmenitiesTab:       tab_list[:show_amenities_tab],
      showFavsTab:            tab_list[:show_favorites_tab]
    }
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
  def background_svg_json
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
    {
      mapId:       sitemap.id,
      mapType:     'sitemap',
      updatedAt:   sitemap.updated_at.to_i,
      imageUrl:    sitemap.validated_image_url,
      imageWidth:  sitemap.try(:width).to_i > 0 ? sitemap.width.to_i : (sitemap.image.present? ? sitemap.image.width.to_i : 0),
      imageHeight: sitemap.try(:height).to_i > 0 ? sitemap.height.to_i : (sitemap.image.present? ? sitemap.image.height.to_i : 0)
    }
  end

  def floorplates_json
    return [] if @community.is_sitemap?
    @community.floorplates.map do |fp|
      {
        mapId:       fp.id,
        mapType:     'floorplate',
        range:       fp.range,
        updatedAt:   fp.updated_at.to_i,
        imageUrl:    fp.validated_image_url,
        imageWidth:  fp.floorplate_image_width.to_i,
        imageHeight: fp.floorplate_image_height.to_i
      }
    end
  end

  def floorplans_json(units_ar = nil)
    units_by_floorplan = (units_ar || @community.units).group_by(&:floorplan_id)

    @community.floorplans.map do |fp|
      fp_units   = units_by_floorplan[fp.id] || []
      first_unit = fp_units.find(&:available) || fp_units.first

      {
        floorplanId:      fp.id,
        name:             fp.name,
        bedrooms:         fp.bedrooms,
        bathrooms:        fp.bathrooms,
        market_rent:      fp.market_rent,
        square_feet:      fp.square_feet,
        description:      fp.description.presence,
        availability_url: first_unit&.get_availability_url(),
        primaryImage:     fp.image.present?           ? fp.validated_image_url                                        : nil,
        secondaryImage:   fp.secondary_image.present? ? fp.convert_to_s3_accelerate_url(fp.secondary_image.url) : nil,
        color:            compute_floorplan_color(fp)
      }
    end
  end

  def amenities_json
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

  def filters_json(units_ar = nil)
    units = units_ar || @community.units.map_units(@community, false).includes(:floorplan)

    {
      bedrooms:      filter_bedroom_options(units),
      availability:  filter_availability_options(units),
      squareFootage: filter_square_footage_data(units),
      priceRange:    filter_price_range_data(units),
      visibility:    property_filters_json,
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

  def compute_unit_ops_color(unit)
    sc = status_colors

    return { color: sc[:model], opacity: 1.0 } if unit.modal_unit

    hex = case unit.unit_status.to_s.downcase.strip
          when "occupied", "occupied no notice", "notice rented"
            sc[:occupied]
          when "occupied on notice", "notice unrented"
            sc[:occupied_on_notice]
          when "vacant", "available", "unoccupied",
               "vacant unrented not ready", "vacant unrented ready"
            sc[:vacant]
          when "vacant lease", "vacant rented ready", "vacant rented not ready"
            sc[:vacant_leased]
          else
            sc[:vacant]
          end

    { color: hex, opacity: 1.0 }
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
    return @community.sitemap.id if @community.is_sitemap?
    @community.floorplate_for_floor(unit.floor)&.id
  end

  def unit_additional_buttons(unit)
    [
      { label: unit.get_virtual_tour_label,      url: unit.get_virtual_tour_url,      openInNewTab: unit.link1_open_in_new_tab? },
      { label: unit.get_additional_button_label, url: unit.get_additional_button_url, openInNewTab: unit.link2_open_in_new_tab? },
      { label: unit.get_schedule_tour_label,     url: unit.get_schedule_tour_url,     openInNewTab: unit.link3_open_in_new_tab? }
    ].select { |btn| btn[:url].present? }
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

  def filter_availability_options(units)
    today = Date.today
    d30   = today + 30; d60 = today + 60; d90 = today + 90; d120 = today + 120
    over120 = @community.units_availability_over_120_days

    seen = []
    units.select(&:available).each do |unit|
      date = unit.available_date || Date.new(0)
      seen << { label: "Now",            value: "now"    } if date <= today
      seen << { label: "This Month",     value: "0-30"   } if date > today  && date <= d30
      seen << { label: "In 31-60 days",  value: "31-60"  } if date >= d30   && date <= d60
      seen << { label: "In 61-90 days",  value: "61-90"  } if date >= d60   && date <= d90
      seen << { label: "In 91-120 days", value: "91-120" } if date >= d90   && date <= d120
      seen << { label: "In 121+ days",   value: "121+"   } if date > d120   && over120
    end

    order = { "now" => 0, "0-30" => 1, "31-60" => 2, "61-90" => 3, "91-120" => 4, "121+" => 5 }
    seen.uniq { |o| o[:value] }.sort_by { |o| order.fetch(o[:value], 99) }
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
end
