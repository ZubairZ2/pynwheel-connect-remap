class ZarembaService < BaseService
  def perform
    property_ids = credentials.zaremba_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        username = credentials.zaremba_username
        password = credentials.zaremba_password
        filename = credentials.zaremba_filename
        url = "http://pynwheel.com/swoop/scripts/proxy_redatasysSFTP.php"
        url = url + "?" + "filename=" + filename + ".xml" + "&" + "username=" + username + "&" + "password=" + password


        result = ""
        response = HTTParty.get(url)
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
          save_zaremba_units(units,property_id)
          if result["Floorplan"].class == Hash
            floorplans = result["Floorplan"]
            save_zaremba_single_floorplans(floorplans,property_id)
          else
            save_zaremba_floorplans(floorplans,property_id)
          end
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
  def save_zaremba_units(units,property_id)
    units.each do |u|
      puts u
      vacateDate = ""

      unit = Unit.find_by(provider: "zaremba",community_id: credentials.community_id,provider_unit_id: u["BuildingID"]+"-"+u["IDValue"],building: u["BuildingID"])#.first_or_initialize
      if unit.present?
          # unit.property_id = property_id
          # unit.unit_type = u["UnitType"]
          # unit.marketing_name = u["MarketingName"]
          # unit.floorplan_id = u["Units"]["Unit"]["Identification"][1]["IDValue"]
          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
            unit.effective_rent = 1.0 #Setting rent to avoid validation issues
            if u["MarketRent"].present?
              unit.effective_rent = u["MarketRent"]
            elsif u["EffectiveRent"].present?
              unit.effective_rent = u["EffectiveRent"]["Min"]
            end
          end

          # unit.floor = u["FloorLevel"]
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            if u["Availability"]["VacancyClass"] == "Vacant"
              unit.availability = "Unoccupied"
              unit.available = true
            else
              unit.availability = "Occupied"
              unit.available = false
            end

          end

          if u["Availability"]["VacancyClass"] == "Vacant"
            year = u["Availability"]["VacateDate"]["Year"]
            month = u["Availability"]["VacateDate"]["Month"]
            day = u["Availability"]["VacateDate"]["Day"]
            vacateDate = Date.parse("#{year}-#{month}-#{day}")
          end
          unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
            unit.available_date = vacateDate
          end

          # building = u["BuildingID"]
          # unit.building = building.present? ? building.gsub("Building ", "") : ""
          # unit.manually_updated = false
          unit.save(validate: false)
      end
    end
  end

  def save_zaremba_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.find_by(provider: "zaremba",community_id: credentials.community_id,provider_floorplan_id: f["IDValue"])#.first_or_initialize
      if floorplan.present?
        # floorplan.property_id = property_id
        # floorplan.name = f["Name"]
        # floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]

        # if f["FloorplanAvailabilityURL"].present?
        #   floorplan.availability_url = f["FloorplanAvailabilityURL"]
        # end
        # room_types = f["Room"]
        # room_types.each do |rt|
        #   if rt["RoomType"] == "Bedroom"
        #     floorplan.bedrooms = rt["Count"]
        #   else
        #     floorplan.bathrooms = rt["Count"]
        #   end
        # end
        # if f["SquareFeet"]["Min"].to_f > 0
        #   floorplan.square_feet = f["SquareFeet"]["Min"]
        # else
        #   floorplan.square_feet = f["SquareFeet"]["Max"]
        # end
        unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated && floorplan.manual_override
          if f["MarketRent"]["Min"].to_f > 0
            floorplan.market_rent = f["MarketRent"]["Min"]
          else
            floorplan.market_rent = f["MarketRent"]["Max"]
          end
        end

        floorplan.save

      end
    end
  end

  def save_zaremba_single_floorplans(floorplans,property_id)

    floorplan = Floorplan.find_by(provider: "zaremba",community_id: credentials.community_id,provider_floorplan_id: floorplans["IDValue"])#.first_or_initialize
    if floorplan.present?
      # floorplan.property_id = property_id
      # floorplan.name = floorplans["Name"]
      # floorplan.unit_count = floorplans["UnitCount"]
      floorplan.units_available = floorplans["UnitsAvailable"]

      # if floorplans["FloorplanAvailabilityURL"].present?
      #   floorplan.availability_url = floorplans["FloorplanAvailabilityURL"]
      # end
      # room_types = floorplans["Room"]
      # room_types.each do |rt|
      #   if rt["RoomType"] == "Bedroom"
      #     floorplan.bedrooms = rt["Count"]
      #   else
      #     floorplan.bathrooms = rt["Count"]
      #   end
      # end
      # if floorplans["SquareFeet"]["Min"].to_f > 0
      #   floorplan.square_feet = floorplans["SquareFeet"]["Min"]
      # else
      #   floorplan.square_feet = floorplans["SquareFeet"]["Max"]
      # end
      unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated  && floorplan.manual_override
        if floorplans["MarketRent"]["Min"].to_f > 0
          floorplan.market_rent = floorplans["MarketRent"]["Min"]
        else
          floorplan.market_rent = floorplans["MarketRent"]["Max"]
        end
      end

      floorplan.save

    end

  end

end