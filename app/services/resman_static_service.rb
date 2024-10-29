class ResmanStaticService < BaseService
  $units_availability_url = ""
  def perform
    property_ids = credentials.resman_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        account_id = credentials.resman_account_id
        url = "#{ENV["RESMAN_BASE_URL"]}/GetMarketing2_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey": ENV["RESMAN_API_KEY"],
                                     "IntegrationPartnerID": ENV["RESMAN_PARTNER_ID"],
                                     "AccountID": account_id,
                                     "PropertyID": property_id,
                                 },
                                 :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )

        if response["ResMan"]["Status"] == "Success"
          units = []
          floorplans = []
          property = response["ResMan"]["Response"]["PhysicalProperty"]["Property"]

          property["ILS_Unit"].each do |pro|
            units << pro
          end

          property["Floorplan"].each do |pro|
            floorplans << pro
          end

          $units_availability_url = property["Information"]["UnitApplicationBaseURL"]
          
          save_resman_property_details(property)
          save_resman_units(units, property_id)
          save_resman_floorplans(floorplans, property_id)
        end
      rescue => error
        raise error
      end
    end
  end

  def save_resman_property_details property
    begin
      @community = Community.find credentials.community_id
      @community.update!(
        name: property["PropertyID"]["MITS:Identification"]["MITS:MarketingName"],
        address: property["PropertyID"]["MITS:Address"]["MITS:Address1"],
        city: property["PropertyID"]["MITS:Address"]["MITS:City"],
        state: property["PropertyID"]["MITS:Address"]["MITS:State"],
        zip: property["PropertyID"]["MITS:Address"]["MITS:PostalCode"],
        latitude: property["ILS_Identification"]["Latitude"],
        longitude: property["ILS_Identification"]["Longitude"]
      )
    rescue => error
      raise error
    end
  end

  def save_resman_units(units,property_id)
    units.each do |u|
      vacateDate = ""
      unit = Unit.where(provider: "resman",community_id: credentials.community_id,provider_unit_id: u["Id"].gsub('*','-')).first_or_initialize
      unless unit.manual_override
        unit.property_id = property_id
        unit.unit_type = u["Unit"]["MITS:Information"]["MITS:UnitType"]
        unit.lease_pricing = nil
        unit_status_update(unit, u)

        unless unit.name_is_updated.present? && unit.name_is_updated
          unit.marketing_name = u["Id"]
        end
        
        unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
          unit.floorplan_id = u["Unit"]["MITS:Information"]["MITS:FloorPlanID"]
        end
        
        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
          unit.effective_rent = 1.0 #Setting rent to avoid validation issues
          if u["Unit"]["MITS:Information"]["MITS:MarketRent"].present?
            unit.effective_rent = u["Unit"]["MITS:Information"]["MITS:MarketRent"]
          elsif u["EffectiveRent"].present? && u["EffectiveRent"]["Avg"].present?
            unit.effective_rent = u["EffectiveRent"]["Avg"]
          end
        end

        unless unit.floor_is_updated.present? && unit.floor_is_updated
          unit.floor = u["FloorLevel"]
        end

        if u["Availability"].present?
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = "Unoccupied"
          end

          year = u["Availability"]["MadeReadyDate"]["Year"]
          month = u["Availability"]["MadeReadyDate"]["Month"]
          day = u["Availability"]["MadeReadyDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")

        else
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = "Occupied"
          end
        end

        unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
          if unit.availability == "Occupied"
            unit.available = false
          else
            unit.available = true
          end
        end
        
        unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
          unit.available_date = vacateDate

        end
        if $units_availability_url.present?
          unit.availability_url = $units_availability_url + "&unitNumber=#{u['Id']}"
        end
        unless unit.building_is_updated.present? && unit.building_is_updated
          building = u["Unit"]["MITS:Information"]["MITS:BuildingID"]
          unit.building = building.present? ? building.gsub("Building ", "") : ""
        end

        unit.manually_updated = false
        unit.save(validate: false)
      end
    end
  end

  def save_resman_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "resman",community_id: credentials.community_id,provider_floorplan_id: f["Id"]).first_or_initialize
      floorplan.property_id = property_id
      unless floorplan.name_is_updated.present? && floorplan.name_is_updated
        floorplan.name = f["Name"]
      end

      floorplan.unit_count = f["UnitCount"]
      floorplan.units_available = f["UnitsAvailable"]
      floorplan.deposit = f["Deposit"]["Amount"]["Value"] rescue 0.0
      if f["FloorplanAvailabilityURL"].present?
        floorplan.availability_url = f["FloorplanAvailabilityURL"]
      end
      room_types = f["Room"]
      room_types.each do |rt|
        if rt["Type"] == "Bedroom"
          unless floorplan.bedroom_is_updated.present? && floorplan.bedroom_is_updated
            floorplan.bedrooms = rt["Count"]
          end
        else
          unless floorplan.bathroom_is_updated.present? && floorplan.bathroom_is_updated
            floorplan.bathrooms = rt["Count"]
          end

        end
      end
      unless floorplan.square_feet_is_updated.present? && floorplan.square_feet_is_updated
        if f["SquareFeet"]["Min"].to_f > 0
          floorplan.square_feet = f["SquareFeet"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["Max"]
        end
      end
      unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated
        if f["MarketRent"]["Min"].to_f > 0
          floorplan.market_rent = f["MarketRent"]["Min"]
        else
          floorplan.market_rent = f["MarketRent"]["Max"]
        end
      end

      add_floorplan_images(floorplan, f['File'])

      floorplan.save(validate: false)

    end
  end

  def add_floorplan_images fp, image_urls
    primary_image = fetch_floorplan_image_url(image_urls)
    fp.image = image_base64(primary_image) if primary_image.present?
  end

  def fetch_floorplan_image_url image_urls
    return unless image_urls.present?
    image_urls['Src'] rescue nil
  end

  def image_base64(image_url)
    return unless image_url.present?
    encoded_url = URI.encode(image_url)
    uri = URI.parse(encoded_url)
    file = uri.open
    image_data = file.read
    encoded_image = Base64.strict_encode64(image_data)
    "data:image/png;base64,#{encoded_image}"
  end

  def unit_status_update unit, u
    begin
      vacancy_class = u["Availability"]["VacancyClass"]
      unit_occupancy_status =  u["Units"]["Unit"]["UnitOccupancyStatus"]

      if (vacancy_class == "Unoccupied") && (unit_occupancy_status == "vacant")
        unit.unit_status = "Unoccupied"
      else
        unit.unit_status = "Occupied"
      end
    rescue => error
      unit.unit_status = "Occupied"
    end
  end
end