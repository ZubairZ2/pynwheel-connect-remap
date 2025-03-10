local_assets_base_url = "http://192.168.101.77:3000"
json.apartments do
  if @community.has_floorplates?
    json.map_type "floorplates"
  else
    json.map_type "sitemap"
  end
  if (@community.display_sitemap || @community.display_floorplan_gallery)
    json.show_apartment_page  true
  else
    json.show_apartment_page false
  end
  json.apartment_page_name @community.apartment_page_name
  json.display_rent @community.display_rent
  json.display_pricing_options @community.display_pricing_options
  json.display_sitemap @community.display_sitemap
  json.display_floorplan_gallery @community.display_floorplan_gallery
  json.display_available_date @community.display_available_date

  if @community.sitemap.present? and !@community.has_floorplates?
    image_url = @community&.sitemap&.image&.url
    # image_url = @community.sitemap.image.url(:svg_for_metro).present? ? @community.sitemap.image.url(:svg_for_metro) : @community.sitemap.image.url
    begin
      json.sitemap Rails.env.development? ? local_assets_base_url+image_url : image_url
    rescue

    end

    json.sitemap_amenities @community.sitemap.amenities do |amenity|
      json.image amenity.image.present? ? (Rails.env.development? ? local_assets_base_url+amenity.image.url : amenity.image.url) : nil
      json.name amenity.name
      json.x_plot amenity.x_plot
      json.y_plot amenity.y_plot
      json.sitemap_id @community.id
      json.id amenity.id
      json.video_link_button_label amenity.video_link_button_label || "3D TOUR"
      json.video_link amenity.video_link
    end

  else
    json.sitemap nil
  end

  # units_floorplans = []
  floorplans = @floorplans
  available_units_and_sold_units = @units# + @community.units.are_sold(@community.enable_svg_mode?)
  json.display_unit_on_homepage @community.display_unit_on_homepage
  json.units @units do |unit|
    if unit.availability == "Unoccupied"
    if @community.data_provider == "psi"
      conditionAvailable = unit.available
    else
      conditionAvailable = 1
    end
      json.marketing_name unit.api_unit_marketing_name
      json.rent @community.get_currency_symbol + (unit.effective_rent.present? ? unit.effective_rent : 0)
      json.availability unit.availability
      json.available_date unit.available_date.present? ? ((unit.available_date < Time.now) ? Time.now.strftime('%m/%d/%Y') : unit.available_date.strftime('%m/%d/%Y')) : Date.today - 1.day
      json.available unit.available
      json.sold unit.sold
      json.x_plot unit.x_plot
      json.y_plot unit.y_plot
      json.building unit.building
      json.unit_type unit.unit_type
      json.provider_unit_id unit.provider_unit_id
      json.id (Unit.find_by provider_unit_id: unit.provider_unit_id).id rescue ""
      json.display_virtual_tour_button_label true #unit.display_virtual_tour_button_label.present? ? unit.display_virtual_tour_button_label : false
      json.virtual_tour_button_label unit.virtual_tour_button_label.present? ? unit.virtual_tour_button_label : "3D Tour"
      json.virtual_tour unit.get_unit_virtual_tour_url()

      if @community.display_rent
        if unit.lease_pricing.present? && @community.display_pricing_options
          json.lease_pricing unit.lease_pricing.gsub('=>', ':')
        else
          json.lease_pricing nil
        end
      else
        json.lease_pricing nil
      end

      json.floorplate_number unit.floor.present? ? unit.floor : 0
      if unit.amenities.plotted_amenities(@community.enable_svg_mode?).size > 0
        json.unit_amenities unit.amenities.plotted_amenities(@community.enable_svg_mode?) do |amenity|
          json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
          json.name amenity.name
          json.x_plot amenity.x_plot
          json.y_plot amenity.y_plot
          json.unit_id unit.id
          #json.id amenity.id
          random_number = SecureRandom.random_number(59999)
          unless random_numbers.include?(random_number)
            random_numbers << random_number
            json.id random_number
          else
            random_number = SecureRandom.random_number(69999)
            random_numbers << random_number
            json.id random_number
          end
        end
      elsif !unit.standard_image_url.present?
        #If unit amenities are not present then send floorplan amenities
        # json.unit_amenities floorplan.amenities.plotted_amenities(@community.enable_svg_mode?) do |amenity|
        #   json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
        #   json.name amenity.name
        #   json.x_plot amenity.x_plot
        #   json.y_plot amenity.y_plot
        #   json.unit_id unit.id
        #   random_number = SecureRandom.random_number(59999)
        #   unless random_numbers.include?(random_number)
        #     random_numbers << random_number
        #     json.id random_number
        #   else
        #     random_number = SecureRandom.random_number(69999)
        #     random_numbers << random_number
        #     json.id random_number
        #   end
        # end
      else
        json.unit_amenities []
      end
    end
  end
  json.floorplans @floorplans do |floorplan|
    json.id (Floorplan.find_by provider_floorplan_id: floorplan.provider_floorplan_id).id rescue ""
    json.provider_floorplan_id floorplan.provider_floorplan_id
    json.name floorplan.name
    json.rent "#{@community.get_currency_symbol}#{floorplan.market_rent}"
    json.units_available floorplan.units_available
    json.unit_count floorplan.unit_count
    json.bedrooms floorplan.bedrooms
    json.bathrooms floorplan.bathrooms
    json.square_feet floorplan.square_feet
    json.description floorplan.description
    json.image floorplan.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.standard_image_url + (floorplan.crop_x.present? ? "?temp/"+floorplan.crop_x.to_s +  floorplan.standard_image_url.split('/')[ floorplan.standard_image_url.split('/').count - 1] : ""): floorplan.standard_image_url + (floorplan.crop_x.present? ? "?temp/"+floorplan.crop_x.to_s+  floorplan.standard_image_url.split('/')[ floorplan.standard_image_url.split('/').count - 1] : "")) : nil
    json.secondary_image floorplan.secondary_image.present? ? (Rails.env.development? ? local_assets_base_url+floorplan.secondary_image.url + (floorplan.crop_x_secondary.present? ? "?temp/"+floorplan.crop_x_secondary.to_s +  floorplan.secondary_image.url.split('/')[ floorplan.secondary_image.url.split('/').count - 1] : ""): floorplan.secondary_image.url + (floorplan.crop_x_secondary.present? ? "?temp/"+floorplan.crop_x_secondary.to_s + floorplan.secondary_image.url.split('/')[ floorplan.secondary_image.url.split('/').count - 1] : "")) : nil
    json.display_virtual_tour_button_label true #floorplan.display_virtual_tour_button_label.present? ? floorplan.display_virtual_tour_button_label : false
    json.virtual_tour_button_label floorplan.virtual_tour_button_label.present? ? floorplan.virtual_tour_button_label : "3D Tour"
    json.virtual_tour floorplan.get_floorplan_virtual_tour_url()

    json.floorplan_amenities floorplan.amenities.plotted_amenities(@community.enable_svg_mode?) do |amenity|
      json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
      json.name amenity.name
      json.x_plot amenity.x_plot
      json.y_plot amenity.y_plot
      json.floorplan_id floorplan.id
      json.id amenity.id
    end
  end
  #json.floorplates @community.floorplates.order("number DESC") do |floorplate|
  if @community.has_floorplates?
    floorplates = @community.floorplates
    floors = floorplates.map{|f| f.floors}.flatten.sort.reverse
    # floorplates = floorplates.sort_by { |f| -f.number }
    json.floorplates floors do |floor|
      floorplate = floorplates.select{|f| f.floors.include?(floor)}.first
      image_url = floorplate.svg_image_url.present? ? floorplate.svg_image_url : floorplate.standard_image_url
      json.id floor
      json.number floor
      json.name floorplate.name
      json.floor_name floorplate.floor_name_added ? floorplate.floor_name : floor
      json.image floorplate.image_url.present? ? (Rails.env.development? ? local_assets_base_url+image_url : image_url) : nil
      
      json.floorplate_amenities floorplate.amenities do |amenity|
        if (amenity.x_plot.present? && amenity.y_plot.present?) && (amenity.x_plot > 0 || amenity.y_plot > 0)
          json.image amenity.standard_image_url.present? ? (Rails.env.development? ? local_assets_base_url+amenity.standard_image_url : amenity.standard_image_url) : nil
          json.name amenity.name
          json.x_plot amenity.x_plot
          json.y_plot amenity.y_plot
          json.floorplate_id floor
          json.id amenity.id
          json.video_link_button_label amenity.video_link_button_label || "3D TOUR"
          json.video_link amenity.video_link
        end
      end

    end
  else
    json.floorplates nil
  end
end