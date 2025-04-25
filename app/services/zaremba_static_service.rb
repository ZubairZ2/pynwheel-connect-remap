class ZarembaStaticService < BaseService
  def perform

    property_ids = credentials.zaremba_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        username = credentials.zaremba_username
        password = credentials.zaremba_password
        filename = credentials.zaremba_filename
        url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php"
        url = url + "?" + "filename=" + filename + ".xml" + "&" + "username=" + username + "&" + "password=" + password

        response = HTTParty.get(url)
        result = ""
        fcount = 0
        if response.present?

          if response['PhysicalProperty']['Property'].class == Array
            response['PhysicalProperty']['Property'].each do |p|

              if p['IDValue'] == property_id
                result = p
              end
            end
          else
            p = response['PhysicalProperty']['Property']

            if p['IDValue'] == property_id
              result = p
            end
          end
          # response['PhysicalProperty']['Property'].each do |p|
          #
          #   if p['IDValue'] == property_id
          #     result = p
          #   end
          # end
          units = []
          floorplans = []

          response['PhysicalProperty']['Property'].present? && result['ILS_Unit'].class == Array && result['ILS_Unit'].each do |pro|
            units << pro
          end

          response['PhysicalProperty']['Property'].present? && result['Floorplan'].class == Array && result["Floorplan"].each do |pro|
            floorplans << pro
          end
          if result["Floorplan"].class == Hash
            floorplans = result["Floorplan"]
            save_zaremba_single_floorplans(floorplans,property_id)
          else
            save_zaremba_floorplans(floorplans,property_id)
          end

          save_zaremba_units(units,property_id)

            # save_website_column_of_community(response)
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = nil
            cred.save
          rescue => err
          end
        else
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
            cred.save
          rescue => err
          end
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        begin
          cred = Credential.find credentials.id
          cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
          cred.save
        rescue => err
        end
        puts '----------------------------' , e.message
      end
    end


  end
  def save_zaremba_units(units, property_id)
    units.each do |u|

      flag = 0
      vacateDate = ""
      # u1 = Unit.where(community_id: credentials.community_id, provider_unit_id: u["IDValue"])
      # u1.each do |u2|
      #   unless u2.building == u["BuildingID"]
      #     flag = 1
      #   end
      #   if flag == 1 && !(u2.marketing_name.split('-')[0] == u2.building)
      #     u2.marketing_name = u2.building+"-"+u2.marketing_name
      #     u2.save(validate: false)
      #   end
      # end
      unit = Unit.where(provider: "zaremba",community_id: credentials.community_id,provider_unit_id: u["BuildingID"]+"-"+u["IDValue"],building: u["BuildingID"]).first_or_initialize

      unit.property_id = property_id
      unit.unit_type = u["UnitType"]
      # if flag == 1 #&& unit.marketing_name.split('-')[0] == unit.building
      unless unit.name_is_updated.present? && unit.name_is_updated
        unit.marketing_name = u["MarketingName"]
      end

      # else
      # unit.marketing_name = u["MarketingName"]
      # end
      unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
        unit.floorplan_id = u["Units"]["Unit"]["Identification"][1]["IDValue"]
      end
      unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues
        if u["MarketRent"].present?
          unit.effective_rent = u["MarketRent"]
        elsif u["EffectiveRent"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
        end
      end
      unit.min_effective_rent = u["EffectiveRent"]["Min"]
      unit.max_effective_rent = u["EffectiveRent"]["Man"]
      unless unit.floor_is_updated.present? && unit.floor_is_updated
        unit.floor = u["FloorLevel"]
      end
      unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
        if u["Availability"]["VacancyClass"] == "Vacant"
          unit.availability = "Unoccupied"
        end
      end
      unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
        if  unit.availability == "Unoccupied"
          unit.available = true
        else
          unit.available = false
        end

      end
      if u["Availability"]["VacancyClass"] == "Vacant"
        year = u["Availability"]["VacateDate"]["Year"]
        month = u["Availability"]["VacateDate"]["Month"]
        day = u["Availability"]["VacateDate"]["Day"]
        vacateDate = Date.parse("#{year}-#{month}-#{day}")
      end
      unless unit.available_date_is_updated.present? && unit.available_date_is_updated
        unit.available_date = vacateDate
      end

      building = u["BuildingID"]
      unless unit.building_is_updated.present? && unit.building_is_updated
        unit.building = building.present? ? building.gsub("Building ", "") : ""
      end

      unit.manually_updated = false
      unit.save(validate: false)
    end
  end

  def save_zaremba_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "zaremba",community_id: credentials.community_id,provider_floorplan_id: f["IDValue"]).first_or_initialize
      floorplan.property_id = property_id
      unless floorplan.name_is_updated.present? && floorplan.name_is_updated
        floorplan.name = f["Name"]
      end

      floorplan.unit_count = f["UnitCount"]
      floorplan.units_available = f["UnitsAvailable"]
      if f["Deposit"].present? # No field for this present
        floorplan.deposit = f["Deposit"]["Amount"]["Value"] rescue 0.0
      end
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

      floorplan.save(validate: false)

    end
  end
  # for 1 floorplan
  def save_zaremba_single_floorplans(floorplans,property_id)

    floorplan = Floorplan.where(provider: "zaremba",community_id: credentials.community_id,provider_floorplan_id: floorplans["IDValue"]).first_or_initialize
    floorplan.property_id = property_id
    unless floorplan.name_is_updated.present? && floorplan.name_is_updated
      floorplan.name = floorplans["Name"]
    end

    floorplan.unit_count = floorplans["UnitCount"]
    floorplan.units_available = floorplans["UnitsAvailable"]
    if floorplans["Deposit"].present? # No field for this present
      floorplan.deposit = floorplans["Deposit"]["Amount"]["Value"]
    end
    if floorplans["FloorplanAvailabilityURL"].present?
      floorplan.availability_url = floorplans["FloorplanAvailabilityURL"]
    end
    room_types = floorplans["Room"]
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
      if floorplans["SquareFeet"]["Min"].to_f > 0
        floorplan.square_feet = floorplans["SquareFeet"]["Min"]
      else
        floorplan.square_feet = floorplans["SquareFeet"]["Max"]
      end
    end
    unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated
      if floorplans["MarketRent"]["Min"].to_f > 0
        floorplan.market_rent = floorplans["MarketRent"]["Min"]
      else
        floorplan.market_rent = floorplans["MarketRent"]["Max"]
      end
    end

    floorplan.save(validate: false)

  end

end