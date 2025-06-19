module CommunitiesHelper
  include ApplicationHelper
  include ActionView::Helpers::NumberHelper

  DATA_ATTRIBUTES_SAME_KEYS = %w[
    is-fav availability-url community-property-id floorplan-name square-feet availability bedrooms
    bathrooms floorplan-image floor sold available
  ].freeze

  DEFAULT_FONT_SIZE = 30
  DEFAULT_MARKER_CODE = "#d37474"
  DEFAULT_MARKER_PRIMARY_CODE = "cf492f"

  STATUS_BASE_DEFAULT_COLORS = {
    occupied: "#f2f2f2",
    occupied_on_notice: "#8545a1",
    vacant_leased: "#f9d648",
    model: "#f57396",
    missing: "#eecea5"
  }

  STATUS_KEYS = %i[
    missing
    occupied
    occupied_on_notice
    vacant
    vacant_leased
    model
  ].freeze

  STATUS_LABELS = [
    "Missing Floorplan",
    "Occupied",
    "Occupied on Notice",
    "Vacant",
    "Vacant Leased",
    "Model"
  ].unshift("Missing Data") # for :missing
  .freeze


  def write_account_report(workbook)
    update_units_count

    worksheet = workbook.add_worksheet("Sheet 1")
    format = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10', 'locked': true })
    format.set_bold()
    format.set_locked()
    format1 = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10' })
    row = 1
    worksheet.freeze_panes(1, 2)
    worksheet.write(0, 0, "Company", format, { 'freeze_panes': true })
    worksheet.write(0, 1, "Property Name", format)
    worksheet.write(0, 2, "Number of Units", format)
    worksheet.write(0, 3, "Address", format)
    worksheet.write(0, 4, "City", format)
    worksheet.write(0, 5, "State", format)
    worksheet.write(0, 6, "Zip", format)
    worksheet.write(0, 7, "Property Email Address", format)
    worksheet.write(0, 8, "eBrochure 'From' Email Address", format)
    worksheet.write(0, 9, "eBrochure 'BCC' Email Address ", format)
    worksheet.write(0, 10, "Phone", format)
    worksheet.write(0, 11, "Map Type", format)
    worksheet.write(0, 12, "Design Style", format)
    worksheet.write(0, 13, "Data Provider", format)
    worksheet.write(0, 14, "Pynwheel Touch (Yes/No)", format)
    worksheet.write(0, 15, "Pynwheel Tour (Yes/No)", format)
    worksheet.write(0, 16, "Map URL", format)
    worksheet.write(0, 17, "Map Embed Code", format)
    worksheet.write(0, 18, "Active/Inactive", format)
    worksheet.write(0, 19, "Subscription Start Date", format)
    worksheet.write(0, 20, "Date Inactivated", format)
    worksheet.write(0, 21, "Billing Month", format)
    worksheet.write(0, 22, "Annual Billing Rate ($)", format)
    worksheet.write(0, 23, "Monthly Billing Rate ($)", format)

    Community.without_test_properties.each do |community|
      if community.present?
        worksheet.write(row, 0, community.company.name, format1)
        worksheet.write(row, 1, community.name, format1)
        worksheet.write(row, 2, community.number_of_units, format1)
        worksheet.write(row, 3, community.address, format1)
        worksheet.write(row, 4, community.city, format1)
        worksheet.write(row, 5, community.state, format1)
        worksheet.write(row, 6, community.zip, format1)
        worksheet.write(row, 7, community.email, format1)
        worksheet.write(row, 8, community.favorite_setting.email_from, format1) if community.favorite_setting.present?
        worksheet.write(row, 9, community.favorite_setting.email_bcc, format1) if community.favorite_setting.present?
        worksheet.write(row, 10, community.phone, format1)
        worksheet.write(row, 11, map_type(community), format1)
        worksheet.write(row, 12, (community.touchscreen_app == true ? community.theme_name.capitalize : "N/A"), format1) if community.theme_name.present?

        if community.data_provider == "psi"
          data_provider = "Entrata"
        elsif community.data_provider == "realpagesvc"
          data_provider = "RealPage"
        elsif community.data_provider == "zaremba"
          data_provider = "RE Data Systems (ftp)"
        elsif community.data_provider.present?
          data_provider = community.data_provider.capitalize
        else
          data_provider = "Nill"
        end
        worksheet.write(row, 13, data_provider, format1)
        worksheet.write(row, 14, community.touchscreen_app == true ? "Yes" : "No", format1)
        worksheet.write(row, 15, community.self_tour == true ? "Yes" : "No", format1)
        worksheet.write(row, 16, community.map_link, format1)
        worksheet.write(row, 17, community.map_embed_code, format1)
        worksheet.write(row, 18, community.locked.present? ? (community.locked ? "Inactive" : "Active") : "Active", format1)
        worksheet.write(row, 19, community.date_activated, format1)
        worksheet.write(row, 20, community.date_inactivated, format1)
        worksheet.write(row, 21, community.billing_type == "annual" ? "#{community.billing_month.present? ? community.billing_month : "Annually"}" : "Monthly", format1)
        
        if community.touchscreen_app == true
          worksheet.write(row, 22, billing_rate_convertion(community.billing_rate_touch), format1)
          worksheet.write(row, 23, billing_rate_convertion(community.billing_rate_touch)/12, format1)
        end

        if community.company.name.downcase == "lincoln"
          worksheet.write(row, 22, billing_rate_convertion(community.lincoln_billing_rate)*12, format1)
          worksheet.write(row, 23, billing_rate_convertion(community.lincoln_billing_rate), format1)

        elsif community.creator_id.present? and community.creator.present? and community.creator.role == "Dwelo admin"
          worksheet.write(row, 22, billing_rate_convertion(community.dwelo_billing_rate)*12, format1)
          worksheet.write(row, 23, billing_rate_convertion(community.dwelo_billing_rate), format1)

        elsif community.self_tour == true and community.touchscreen_app == true and community.company.name.downcase != "lincoln" and ((community.creator_id.present? and community.creator.present? and community.creator.role != "Dwelo admin") or community.creator_id.nil?)
          worksheet.write(row, 22, billing_rate_convertion(community.billing_rate_selftour)*12, format1)
          worksheet.write(row, 23, billing_rate_convertion(community.billing_rate_selftour), format1)

        elsif community.self_tour == false and community.touchscreen_app == false
          worksheet.write(row, 22, billing_rate_convertion(community.billing_rate_maps)*12, format1)
          worksheet.write(row, 23, billing_rate_convertion(community.billing_rate_maps), format1)

        elsif community.self_tour == true and community.touchscreen_app == true
          worksheet.write(row, 22, billing_rate_convertion(community.billing_rate_for_both)*12, format1)
          worksheet.write(row, 23, billing_rate_convertion(community.billing_rate_for_both), format1)

        elsif community.self_tour == true and community.touchscreen_app == false
          worksheet.write(row, 22, billing_rate_convertion(community.billing_rate_selftour)*12, format1)
          worksheet.write(row, 23, billing_rate_convertion(community.billing_rate_selftour), format1)
        end

        row = row + 1
      end
    end

    worksheet2 = create_work_sheet2(workbook)

    workbook.close

    temp_file = Tempfile.new("AccountReport.zip")
    reportFiles = Dir.entries('public/AccountReport')
    Zip::File.open(temp_file.path, Zip::File::CREATE) do |zip_file|
      reportFiles.each do |d|
        unless d == "." || d == ".."
          zip_file.add(d, "public/AccountReport/AccountReport.xlsx")
        end
      end
    end
    File.read(temp_file.path)
  end

  def write_authenteq_report(workbook)

    worksheet = workbook.add_worksheet("Sheet 1")
    format = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10', 'locked': true })
    format.set_bold()
    format.set_locked()
    format1 = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10' })
    row = 1
    worksheet.freeze_panes(1, 2)
    worksheet.write(0, 0, "Company", format)
    worksheet.write(0, 1, "Property Name", format)
    worksheet.write(0, 2, "Name", format)
    worksheet.write(0, 3, "Email", format)
    worksheet.write(0, 4, "Phone Number", format)
    worksheet.write(0, 5, "Tour Date", format)
    worksheet.write(0, 6, "Tour Time UTC", format)
    worksheet.write(0, 7, "Id Verification Provider", format)
    community = current_community
    tour_histories = TourHistory.where(tour_id: community.community_tour.id, verified_by: "authenteq", created_at: (Date.today - 30.days)..Date.today + 1)

    tour_histories.each do |th|
      if th.present?
        tour_user = TourUser.find th.tour_user_id
        worksheet.write(row, 0, community.company.name, format1)
        worksheet.write(row, 1, community.name, format1)
        worksheet.write(row, 2, tour_user.name, format1)
        worksheet.write(row, 3, tour_user.email, format1)
        worksheet.write(row, 4, tour_user.phone_number, format1)
        worksheet.write(row, 5, th.created_at.strftime("%m/%d/%Y"), format1)
        worksheet.write(row, 6, th.created_at.strftime("%H:%M"), format1)
        worksheet.write(row, 7, "Authenteq", format1)

        row = row + 1
      end
    end
    workbook.close

    temp_file = Tempfile.new("AuthenteqReport.zip")
    reportFiles = Dir.entries('public/AuthenteqReport')
    Zip::File.open(temp_file.path, Zip::File::CREATE) do |zip_file|
      reportFiles.each do |d|
        unless d == "." || d == ".."
          zip_file.add(d, "public/AuthenteqReport/AuthenteqReport.xlsx")
        end
      end
    end
    File.read(temp_file.path)
  end

  def check_tour_user_card_info(community, tour_user)
    community&.community_tour&.verification_type == "authenteq" && community&.community_tour&.tour_setting&.charge_user_for_id_verfication && community&.community_tour&.visual_id_verification && tour_user&.strip_customer_id.blank?
  end

  def check_visual_id_verification(tour_user, community)
    tour_type = tour_user.tour_type
    authentiq_verified_at = tour_user.authentiq_verified_at
    checkpoint_verified_at = tour_user.checkpoint_verified_at
    is_authentiq_verified = tour_user.is_authentiq_verified
    is_checkpoint_verified = tour_user.is_checkpoint_verified
    time_zone = community.get_time_zone()
    current_tour_time = params[:current_time] if params[:current_time].present?
    if community.community_tour.visual_id_verification && tour_type != "virtual_tour"
      if community.community_tour.verification_type == "authenteq"
        if !is_authentiq_verified
          true
        elsif is_authentiq_verified and (current_tour_time > (authentiq_verified_at + 30.days))
          true
        elsif is_authentiq_verified and (current_tour_time < (authentiq_verified_at + 30.days))
          false
        else
          false
        end
      elsif community.community_tour.verification_type == "check_point_id"
        if !is_checkpoint_verified
          true
        elsif is_authentiq_verified and (current_tour_time > (checkpoint_verified_at + 30.days))
          true
        elsif is_authentiq_verified and (current_tour_time < (checkpoint_verified_at + 30.days))
          false
        else
          false
        end

      elsif community.community_tour.verification_type == "email"
        community.community_tour.visual_id_verification
      end
    else
      false
    end
  end

  def fetch_unit_info_struct_for_webpage(unit, floorplan)
    struct = {
      id: unit.id,
      marketing_name: unit.marketing_name,
      market_rent: unit.effective_rent,
      building: unit.building,
      bedrooms: if floorplan.present?
                  hide_decimals(floorplan.bedrooms)
                else
                  nil
                end,
      bathrooms: if floorplan.present?
                   hide_decimals(floorplan.bathrooms)
                 else
                   nil
                 end,
      square_feet: if unit.square_feet?
                     hide_decimals(unit.square_feet)
                   elsif floorplan.present?
                     hide_decimals(floorplan.square_feet)
                   else
                     nil
                   end,
      availability: unit.availability,
      available_date: if unit.available_date.present?
                        unit.available_date
                      else
                        nil
                      end,
      x_plot: unit.x_plot,
      y_plot: unit.y_plot,
      pointer_data: unit.pointer_data,
      floor: unit.floor,
      sold: unit.sold,
      available: unit.available,
      provider_floorplan_id: floorplan&.provider_floorplan_id,
      community_property_id: if @community_info.credential.present? && @community_info.credential.property_id.present?
                               @community_info.credential.property_id
                             else
                               0
                             end,
      lease_term: unit.lease_term,
      availability_url: unit.get_availability_url(),
      floorplan_image: fetch_image_url(floorplan, unit),
      is_fav: unit&.community&.favorite_stop&.favorite_unit&.include?(unit.id.to_s) || unit_id_is_in_cookies?(cookies[:favorite_unit_ids], unit.id),
      floorplan_name: if floorplan.present?
                        floorplan.name
                      else
                        ''
                      end,
      lease_pricing: (unit.lease_pricing.present? && unit.community.display_pricing_options) ? unit.lease_pricing : "",
      description: if unit.description.present?
                     unit.description
                   elsif floorplan.description.present?
                     floorplan.description
                   else
                     ""
                   end,
      display_rent: unit&.community&.display_rent,
      additional_fees: @community.get_additional_fees(unit),
      property_id: unit.property_id,
      unit_status: unit&.unit_status,
      model_unit: unit&.modal_unit
    }
    struct[:data_attributes] = fetch_unit_data_attributes(unit, struct)

    struct
  end


  def fetch_unit_info_struct_for_ploting(unit, floorplan)
    struct = {
      id: unit.id,
      marketing_name: unit.marketing_name,
      market_rent: unit.effective_rent,
      building: unit.building,
      availability: unit.availability,
      available_date: if unit.available_date.present?
                        unit.available_date
                      else
                        nil
                      end,
      x_plot: unit.x_plot,
      y_plot: unit.y_plot,
      pointer_data: unit.pointer_data,
      floor: unit.floor,
      sold: unit.sold,
      available: unit.available,
      provider_floorplan_id: floorplan&.provider_floorplan_id,
      community_property_id: if @community_info.credential.present? && @community_info.credential.property_id.present?
                               @community_info.credential.property_id
                             else
                               0
                             end,
      availability_url: unit.get_availability_url(),
      floorplan_image: fetch_image_url(floorplan, unit),
      floorplan_name: if floorplan.present?
                        floorplan.name
                      else
                        ''
                      end
    }
    struct[:data_attributes] = fetch_unit_data_attributes_for_plotting(unit, struct)

    struct
  end

  def fetch_amenity_info_struct_for_ploting(amenity)
    struct = {
      id: amenity.id,
      name: amenity.name,
      image_url: amenity.validated_image_url,
      floor: amenity.floor,
      floorplate_id: amenity.amenityable_id,
      x_plot: amenity.x_plot,
      y_plot: amenity.y_plot,
      pointer_data: amenity.pointer_data,
      galleries: amenity.amenity_galleries,
      show_name: @community.show_amenity_name
    }
    struct[:data_attributes] = fetch_amenity_data_attributes_for_plotting(amenity, struct)

    struct
  end

  def default_unit_marker_font_size(community)
    theme_name = community&.theme_name
    design = community&.design

    case theme_name
    when /gables/
      design&.property_map_size_integer || DEFAULT_FONT_SIZE
    when 'modernist'
      design&.modernist_property_map_size || DEFAULT_FONT_SIZE
    when 'futurist'
      design&.futurist_property_map_size || DEFAULT_FONT_SIZE
    when 'expressionist'
      design&.expressionist_property_map_size || DEFAULT_FONT_SIZE
    when 'panther'
      design&.panther_property_map_size || DEFAULT_FONT_SIZE
    else
      DEFAULT_FONT_SIZE
    end
  end

  def default_unit_marker_color(community)
    theme_name = community&.theme_name
    design = community&.design

    if community&.display_tbd_legend? || theme_name&.include?('gables')
      design&.property_map_color || DEFAULT_MARKER_CODE
    else
      case theme_name
      when 'modernist'
        colors = [design&.modernist_map_marker_color, 'no color', '']
        colors.include?(design&.modernist_map_marker_color) ? (design&.primary_color || DEFAULT_MARKER_PRIMARY_CODE) : (design&.modernist_map_marker_color || DEFAULT_MARKER_PRIMARY_CODE)
      when 'futurist'
        design&.futurist_property_map_marker_color || DEFAULT_MARKER_CODE
      when 'expressionist'
        design&.expressionist_property_map_marker_color || DEFAULT_MARKER_CODE
      when 'panther'
        design&.panther_property_map_marker_color || DEFAULT_MARKER_CODE
      else
        'rgba(247, 0, 0, 0.61)'
      end
    end
  end

  def default_amenity_marker_font_size(community)
    theme_name = community&.theme_name
    design = community&.design

    case theme_name
    when /gables/
      design&.amenity_map_marker_size_integer || DEFAULT_FONT_SIZE
    when 'modernist'
      design&.modernist_amenity_map_size || DEFAULT_FONT_SIZE
    when 'futurist'
      design&.futurist_amenity_map_size || DEFAULT_FONT_SIZE
    when 'expressionist'
      design&.expressionist_amenity_map_size || DEFAULT_FONT_SIZE
    when 'panther'
      design&.panther_amenity_map_size || DEFAULT_FONT_SIZE
    else
      DEFAULT_FONT_SIZE
    end
  end

  def default_amenity_marker_color(community)
    theme_name = community&.theme_name
    design = community&.design

    case theme_name
    when /gables/
      design&.amenity_map_marker_color || DEFAULT_MARKER_CODE
    when 'modernist'
      colors = [design&.modernists_amenity_map_marker_color, 'no color', '']
      colors&.include?(design&.modernists_amenity_map_marker_color) ? (design&.primary_color || DEFAULT_MARKER_PRIMARY_CODE) : (design&.modernists_amenity_map_marker_color || DEFAULT_MARKER_PRIMARY_CODE)
    when 'futurist'
      design&.futurist_amenity_map_marker_color || DEFAULT_MARKER_CODE
    when 'expressionist'
      design&.expressionist__amenity_map_marker_color || DEFAULT_MARKER_CODE
    when 'panther'
      design&.panther_amenity_map_marker_color || DEFAULT_MARKER_CODE
    else
      'rgba(247, 0, 0, 0.61)'
    end
  end

  def default_margins(community)
    unit_font_size = default_unit_marker_font_size(community)
    amenity_marker_font_size = default_amenity_marker_font_size(community)

    left_margin = ((unit_font_size.to_f - 35) / 5).to_i
    top_margin = ((13.0 / 25.0) * unit_font_size.to_f).to_i
    span_size_x = (5 / 25.0) * unit_font_size.to_f
    span_size_y = (7 / 25.0) * unit_font_size.to_f
    span_size = (9 / 25.0) * unit_font_size.to_f

    camera_margin = case amenity_marker_font_size.to_i
                    when 0..27 then 3
                    when 28..30 then 4
                    when 31..33 then 5
                    when 34..35 then 6
                    else 6
                    end

    amenity_marker_font_size_adj = amenity_marker_font_size.to_i - 5
    camera_font_size = amenity_marker_font_size_adj / 2

    if community.enable_svg_mode?
      left_margin = 13
      top_margin = 34
    end

    {
      left_margin: left_margin,
      top_margin: top_margin,
      span_size_x: span_size_x,
      span_size_y: span_size_y,
      span_size: span_size,
      camera_margin: camera_margin,
      camera_font_size: camera_font_size,
      amenity_left_margin: 13,
      amenity_top_margin: 13
    }
  end

  def status_based_default_colors(community)
    design = community&.design

    STATUS_KEYS.index_with do |status|
      custom_color = case status
                    when :occupied then design&.property_map_occupied_color
                    when :occupied_on_notice then design&.property_map_occupied_on_notice_color
                    when :vacant then nil # ensure vacant exists for completeness
                    when :vacant_leased then design&.property_map_vacant_leased_color
                    when :model then design&.property_map_model_color
                    when :missing then design&.property_map_missing_color
                    end
      custom_color || STATUS_BASE_DEFAULT_COLORS[status]
    end
  end

  def build_legend_items(community)
    marker_colors = status_based_default_colors(community)

    # Exclude :missing if SVG is disabled
    filtered_keys = community.enable_svg_mode? ? STATUS_KEYS : STATUS_KEYS - [:missing]

    filtered_keys.map.with_index do |key, idx|
      color = marker_colors[key]
      label = STATUS_LABELS[idx]
      color ? { label:, color: } : nil
    end.compact
  end

  def map_configuration(community)
    {
      unit_marker_font_size: default_unit_marker_font_size(community),
      unit_marker_color: default_unit_marker_color(community),
      amenity_marker_font_size: default_amenity_marker_font_size(community) - 5,
      amenity_marker_color: default_amenity_marker_color(community),
      margins: default_margins(community),
      tbd_colors: status_based_default_colors(community),
      legend_items: build_legend_items(community)
    }
  end

  def get_min_floor(community_info:, units_with_floorplan_info_json:, floors:)
    return nil unless community_info.has_floorplates?

    begin
      parsed_floors = JSON.parse(units_with_floorplan_info_json).map { |u| u["floor"] }.compact
      min_floor = parsed_floors.min
    rescue JSON::ParserError, TypeError
      min_floor = floors&.min
    end

    if floors.present? && !floors.include?(min_floor)
      min_floor = floors.min
    end

    min_floor
  end

  def amenity_coordinates(amenity, svg_enabled:)
    if svg_enabled
      coords = amenity.pointer_data.is_a?(Hash) ? amenity.pointer_data.values_at('x_plot', 'y_plot') : [0, 0]
    else
      coords = [amenity.x_plot, amenity.y_plot]
    end
    
    coords.map(&:to_i)
  end

  private

  def fetch_image_url floorplan, unit
    unit&.validated_image_url || floorplan&.validated_image_url || "/assets/default.jpeg"
  end

  def fetch_unit_data_attributes(unit, struct)
    { 
      "target": "#unitModal",
      "toggle": "modal",
      "unit-id": unit.id,
      "floorplan-provider-id": struct[:provider_floorplan_id],
      "unit-x-plot": unit.x_plot,
      "unit-y-plot": unit.y_plot,
      "pointer-data": unit.pointer_data.to_json,
      "community-id": @community.id,
      "website": @community_info.website,
      "provider": @community_info.data_provider,
      "unit-provider-id": unit.provider_unit_id,
      "unit-marketing-name": unit.api_unit_marketing_name,
      "available-date": determine_available_date(struct[:available_date] || Date.new(0)),
      "market-rent": number_with_precision(struct[:market_rent] || 0, precision: 2, delimiter: ','),
      "total-market-rent": number_with_precision(struct[:market_rent] || 0, precision: 2, delimiter: ','),
      "title": unit.api_unit_marketing_name,
      "unit-virtual-tour-label": unit.get_virtual_tour_label,
      "unit-virtual-tour-url": unit.get_virtual_tour_url,
      "unit-lease-term": struct[:lease_term],
      "unit-lease-pricing": struct[:lease_pricing],
      "unit-additional-fees": struct[:additional_fees],
      "unit-description": struct[:description],
      "property-id": struct[:property_id],
      "unit-status": struct[:unit_status],
      "model-unit": struct[:model_unit],
      "config": map_configuration(@community),
    }.transform_keys { |key| "data-#{key}".to_sym }.merge(
      DATA_ATTRIBUTES_SAME_KEYS.each_with_object({}) do |key, result|
        result["data-#{key}".to_sym] = struct[key.underscore.to_sym]
      end
    )
  end

  def fetch_unit_data_attributes_for_plotting(unit, struct)
    title = (unit.building.present? ? unit.building + '-' : '') + unit.marketing_name
    current_data_scope = instance_variable_defined?(:@sitemap) ? 'sitemap' : 'floorplate'
    floorplate_id = instance_variable_get("@#{current_data_scope}").id if current_data_scope == 'floorplate'

    { 
      "toggle": "modal",
      "name": "plot",
      "target": "#svg-markers-modal",
      "provider": @community_info.data_provider,
      "provider-unit-id": unit.provider_unit_id,
      "title": title,
      "href": "/communities/#{@community.id}/units/#{unit.provider_unit_id}/#{ floorplate_id.present? ? 'remove_plot_from_floorplate?floorplate_id=' + floorplate_id.to_s : 'remove_plot'}",
      "horizontal": unit.pointer_data.is_a?(Hash) ? unit.pointer_data['x_plot'] : 0,
      "vertical": unit.pointer_data.is_a?(Hash) ? unit.pointer_data['y_plot'] : 0,
      "pointer-data": unit.pointer_data.to_json,
      "unit-form-url": "/communities/#{@community.id}/units/#{unit.id}/adjust_position",
      "plotted-category": "unit"
    }.transform_keys { |key| "data-#{key}".to_sym }.merge(title: title)
  end

  def fetch_amenity_data_attributes_for_plotting(amenity, struct)
    title = amenity.name

    current_data_scope = instance_variable_defined?(:@sitemap) ? 'sitemap' : 'floorplate'
    {
      "provider-unit-id": amenity.id,
      "name": "plot",
      "target": "#confirm-delete",
      "toggle": "modal",
      "href": "/communities/#{@community.id}/#{current_data_scope.pluralize}/#{instance_variable_get("@#{current_data_scope}").id}/amenities/#{amenity.id}/remove_amenity",
      "plotted-category": "amenity"
    }.transform_keys { |key| "data-#{key}".to_sym }.merge(title: title)

  end

  def get_unit_marker_color(community, unit, marker_colors, default_marker_color)
    result = get_multi_property_unit_marker_color(community, unit, default_marker_color)

    if community&.display_tbd_legend?
      case unit.unit_status&.downcase
      when "occupied", "occupied no notice", "notice rented"
        result = marker_colors[:occupied] || "#f2f2f2";
      when "occupied on notice", "notice unrented"
        result = marker_colors[:occupied_on_notice] || "#8545a1";
      when "vacant", "available", "unoccupied", "vacant unrented not ready", "vacant unrented ready"
        result = marker_colors[:vacant] || "#d37474";
      when "vacant lease", "vacant rented ready", "vacant rented not ready"
        result = marker_colors[:vacant_leased] || "#f9d648";
      else
        result = default_marker_color;
      end

      if unit.modal_unit
        result = marker_colors[:model] || "#f57396";
      end
    end

    return result;
  end

  def get_multi_property_unit_marker_color(community, unit, default_marker_color)
    return default_marker_color || "#d37474" unless @have_multi_property_ids

    sub_community = community.sub_communities.find { |s_com| s_com&.property_id&.strip == unit&.property_id&.strip }
    sub_community&.map_marker_color
  end

  def create_work_sheet2 workbook
    worksheet2 = workbook.add_worksheet("Sheet 2")
    format = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10', 'locked': true })
    format.set_bold()
    format.set_locked()
    format1 = workbook.add_format({ 'align': 'left', 'font': 'Arial', 'size': '10' })
    row = 1

    worksheet2.write(0, 0, "All Active Properties", format)
    worksheet2.write(0, 1, "Floorplates(Touch + Launch)", format)
    worksheet2.write(0, 2, "Property Maps(Touch + Launch)", format)
    worksheet2.write(0, 3, "Futurist(Touch + Launch)", format)
    worksheet2.write(0, 4, "Modernist(Touch + Launch)", format)
    worksheet2.write(0, 5, "Expressionist(Touch + Launch)", format)
    worksheet2.write(0, 6, "State Name", format)
    worksheet2.write(0, 7, "Properties Count In Each State", format)

    worksheet2.write(1, 0, Community.active_client_properties.size, format)
    worksheet2.write(1, 1, map_type_percentage(false), format)
    worksheet2.write(1, 2, map_type_percentage(true), format)
    worksheet2.write(1, 3, design_type_percentage("futurist"), format)
    worksheet2.write(1, 4, design_type_percentage("modernist"), format)
    worksheet2.write(1, 5, design_type_percentage("expressionist"), format)
    
    Community.count_properties_in_each_state.each_with_index do |state, index|
      if state[0].present? 
        worksheet2.write(index + 1, 6, state[0].strip, format)
        worksheet2.write(index + 1, 7, state[1], format)
      end
    end

    worksheet2
  end

  def map_type_percentage is_sitemap
    total_count = Community.active_client_properties.size
    touch_and_launch_properties = Community.active_touch_properties | Community.launch_properties
    properties_count = Community.where(id: touch_and_launch_properties.map(&:id), is_sitemap: is_sitemap).size
    "#{(properties_count *100) / total_count}%"
  end

  def design_type_percentage design_type
    total_count = Community.active_client_properties.size
    touch_and_launch_properties = Community.active_touch_properties | Community.launch_properties
    properties_count = Community.where(id: touch_and_launch_properties.map(&:id), theme_name: design_type).size
    "#{(properties_count *100) / total_count}%"
  end

  def billing_rate_convertion billing_rate
    return 0 unless billing_rate.present?
    billing_rate&.gsub(/[$,]/, '')&.to_i rescue 0
  end

  def map_type community
    community.is_sitemap ? "Property Maps" : "Floorplates"
  end

  def update_units_count
    ActiveRecord::Base.connection.execute( <<-SQL
                                              UPDATE communities
                                              SET number_of_units = subquery.units_total
                                              FROM (
                                                  SELECT communities.id AS community_id, COUNT(units.id) AS units_total
                                                  FROM communities
                                                  LEFT JOIN units ON units.community_id = communities.id
                                                  GROUP BY communities.id
                                              ) AS subquery
                                              WHERE communities.id = subquery.community_id;
                                            SQL
                                          )
  end

end
