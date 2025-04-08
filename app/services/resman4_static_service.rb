class Resman4StaticService < BaseService
  $units_availability_url = ""
  def perform
    property_ids = credentials.resman_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        account_id = credentials.resman_account_id
        url = "#{ENV["RESMAN_BASE_URL"]}/GetMarketing4_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey":  ENV["RESMAN_API_KEY"],
                                     "IntegrationPartnerID": ENV["RESMAN_PARTNER_ID"],
                                     "AccountID": account_id,
                                     "PropertyID": property_id,
                                 },
                                 :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )

        if response["ResMan"]["Status"] == "Success"
          units = []
          floorplans = []
          property_data = response.dig("ResMan", "Response", "PhysicalProperty", "Property")

          if property_data.present?
            property_data["ILS_Unit"]&.each do |pro|
              units << pro
            end

            if property_data["Floorplan"].present?
              case property_data["Floorplan"]
              when Hash
                floorplans << property_data["Floorplan"]
              when Array
                property_data["Floorplan"]&.each do |pro|
                  floorplans << pro
                end
              end
            end

            $units_availability_url = property_data.dig("Information", "UnitApplicationBaseURL")

            save_resman_property_details(property)
            save_resman_units(units, property_id)
            save_resman_floorplans(floorplans, property_id)
          end
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
        name: property["PropertyID"]["MarketingName"],
        address: property["PropertyID"]["Address"]["AddressLine1"],
        city: property["PropertyID"]["Address"]["City"],
        state: property["PropertyID"]["Address"]["State"],
        zip: property["PropertyID"]["Address"]["PostalCode"],
        phone: get_phone_number(property),
        email: property["PropertyID"]["Email"],
        website: property["PropertyID"]["WebSite"],
        latitude: property["ILS_Identification"]["Latitude"],
        longitude: property["ILS_Identification"]["Longitude"]
      )
    rescue => error
      raise error
    end
  end
  
  def get_phone_number property
    property["PropertyID"]["Phone"]["PhoneNumber"]
  rescue
    property["PropertyID"]["Phone"][0]["PhoneNumber"] rescue ""
  end

  def save_resman_units(units,property_id)
    units.each do |u|
      vacateDate = ""

      unit = Unit.where(provider: "resman",community_id: credentials.community_id,provider_unit_id: u["IDValue"].gsub('*','-')).first_or_initialize
      unless unit.manual_override
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit_status_update(unit, u)
        unit.lease_pricing = get_unit_lease_prising(u)

        unless unit.name_is_updated.present? && unit.name_is_updated
          unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
        end
        
        unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
          unit.floorplan_id = u["Units"]["Unit"]["UnitType"]
        end
        
        if u["EffectiveRent"].present?
          unit.min_effective_rent = u["EffectiveRent"]["Min"] if u["EffectiveRent"]["Min"].present?
          unit.max_effective_rent = u["EffectiveRent"]["Max"] if u["EffectiveRent"]["Max"].present?
        end

        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
          unit.effective_rent = 1.0 #Setting rent to avoid validation issues

          if u["EffectiveRent"].present? && u["EffectiveRent"]["Min"].present?
            unit.effective_rent = u["EffectiveRent"]["Min"]

          elsif u["Units"]["Unit"]["MarketRent"].present?
            unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
          end
        end

        # unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
        #   if u["Units"]["Unit"]["MarketRent"].present?
        #     unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
        #   end
        # end 

        unless unit.floor_is_updated.present? && unit.floor_is_updated
          unit.floor = u["FloorLevel"]
        end

        if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = "Unoccupied"
          end

          year = u["Availability"]["MadeReadyDate"]["Year"]
          month = u["Availability"]["MadeReadyDate"]["Month"]
          day = u["Availability"]["MadeReadyDate"]["Day"]

          vacateDate = Date.parse("#{year}-#{month}-#{day}")
          
          # unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
          #   if vacateDate >= Date.today
          #     unit.availability = "Unoccupied"
          #   else
          #     unit.availability = "Unoccupied"
          #   end
          # end
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
          unit.availability_url = $units_availability_url + "&unitNumber=#{u["IDValue"]}"
        end

        unless unit.building_is_updated.present? && unit.building_is_updated
          building = u["Units"]["Unit"]["BuildingName"]
          unit.building = building.present? ? building.gsub("Building ", "") : ""
        end

        unit.manually_updated = false
        unit.save(validate: false)
      end
    end
  end

  def save_resman_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "resman",community_id: credentials.community_id,provider_floorplan_id: f["IDValue"]).first_or_initialize
      floorplan.property_id = property_id
      
      unless floorplan.name_is_updated.present? && floorplan.name_is_updated
        floorplan.name = f["Name"]
      end

      floorplan.unit_count = f["UnitCount"]
      floorplan.units_available = f["UnitsAvailable"]
      floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["Exact"] rescue 0.0
      
      if f["FloorplanAvailabilityURL"].present?
        floorplan.availability_url = f["FloorplanAvailabilityURL"]
      end
      
      room_types = f["Room"]
      room_types.each do |rt|
        if rt["RoomType"] == "Bedroom"
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

  def get_unit_lease_prising unit, leasing = ""
    if (unit && unit["Pricing"]).present?
      if unit["Pricing"]["MITS_OfferTerm"].kind_of?(Array)
        unit["Pricing"]["MITS_OfferTerm"].each do |pr|
          rent = pr["EffectiveRent"]
          term = pr["Term"]

          leasing = leasing + term.to_s + ":" + rent.to_s + ";"
        end

      elsif unit["Pricing"]["MITS_OfferTerm"].kind_of?(Object)
        rent = unit["Pricing"]["MITS_OfferTerm"]["EffectiveRent"]
        term = unit["Pricing"]["MITS_OfferTerm"]["Term"]

        leasing = leasing + term.to_s + ":" + rent.to_s + ";"
      end
    end

    leasing
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