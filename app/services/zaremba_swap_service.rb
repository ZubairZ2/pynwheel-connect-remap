class ZarembaSwapService < BaseService
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
        if response.present?
          result = ""
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
          #   if p['IDValue'] == property_id
          #     result = p
          #   end
          # end
          units = []
          floorplans = []
          response['PhysicalProperty']['Property'].present? && result['ILS_Unit'].class == Array && result['ILS_Unit'].each do |pro|
            units << pro

          end
          response['PhysicalProperty']['Property'].present? && result["Floorplan"].class == Array && result["Floorplan"].each do |pro|
            floorplans << pro
          end
          save_zaremba_units(units,property_id)
          if result["Floorplan"].class == Hash
            floorplans = result["Floorplan"]
            save_zaremba_single_floorplans(floorplans,property_id)
          else
            save_zaremba_floorplans(floorplans,property_id)
          end
      
          rename_provider

          # save_website_column_of_community(response)
        else
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        puts '----------------------------' , e.message
      end
    end
  end
  def save_zaremba_units(units, property_id)
    units.each do |u|
      puts u
      flag = 0
      vacateDate = ""

      unit = Unit.where(community_id: credentials.community_id,marketing_name: u["MarketingName"])
      unless unit.present?
        unit = Unit.find_by(community_id: credentials.community_id,marketing_name: u["BuildingID"]+"-"+u["MarketingName"])
      end
      if unit.count > 1
        unit = Unit.where(community_id: credentials.community_id,marketing_name: u["MarketingName"],building: u["BuildingID"])
        unless unit.present?
          unit = Unit.find_by(community_id: credentials.community_id,marketing_name: u["BuildingID"]+"-"+u["MarketingName"],building: u["BuildingID"])
        end
      end
      if unit.present?
        unit = unit.first
        # u1 = Unit.where(community_id: credentials.community_id, provider_unit_id: u["IDValue"])
        # u1.each do |u2|
        #   unless u2.building == u["BuildingID"]
        #     flag = 1
        #   end
        #   # if flag == 1 && !(u2.marketing_name.split('-')[0] == u2.building)
        #   #   u2.marketing_name = u2.building+"-"+u2.marketing_name
        #   #   u2.save(validate: false)
        #   # end
        # end

        unit.property_id = property_id
        unit.provider = "zaremba_new"
        unit.provider_unit_id = u["BuildingID"]+"-"+u["IDValue"]
        unit.unit_type = u["UnitType"]

        # if flag == 1 #&& unit.marketing_name.split('-')[0] == unit.building
        unit.marketing_name = u["MarketingName"]
        # else
        #   unit.marketing_name = u["MarketingName"]
        # end

        unit.floorplan_id = u["Units"]["Unit"]["Identification"][1]["IDValue"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues
        if u["MarketRent"].present?
          unit.effective_rent = u["MarketRent"]
        elsif u["EffectiveRent"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
        end
        unit.floor = u["FloorLevel"]
        if u["Availability"]["VacancyClass"] == "Vacant"
          unit.availability = "Unoccupied"
          unit.available = true
        else
          unit.availability = "Occupied"
          unit.available = false
        end
        if u["Availability"]["VacancyClass"] == "Vacant"
          year = u["Availability"]["VacateDate"]["Year"]
          month = u["Availability"]["VacateDate"]["Month"]
          day = u["Availability"]["VacateDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        end
        unit.available_date = vacateDate
        building = u["BuildingID"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.manually_updated = false

        unit.save(validate: false)
      else
        dup = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["BuildingID"]+"-"+u["IDValue"],building: u["BuildingID"])
        if dup.present?
          dup.destroy
        end
        unit = Unit.new


        # u1 = Unit.where(community_id: credentials.community_id, provider_unit_id: u["IDValue"])
        # u1.each do |u2|
        #   unless u2.building == u["BuildingID"]
        #     flag = 1
        #   end
        #   # if flag == 1 && !(u2.marketing_name.split('-')[0] == u2.building)
        #   #   u2.marketing_name = u2.building+"-"+u2.marketing_name
        #   #   u2.save(validate: false)
        #   # end
        # end

        unit.community_id = credentials.community_id
        unit.property_id = property_id
        unit.provider = "zaremba_new"

        unit.provider_unit_id =  u["BuildingID"]+"-"+u["IDValue"]
        unit.unit_type = u["UnitType"]

        # if flag == 1 #&& unit.marketing_name.split('-')[0] == unit.building
        unit.marketing_name = u["MarketingName"]
        # else
        #   unit.marketing_name = u["MarketingName"]
        # end

        unit.floorplan_id = u["Units"]["Unit"]["Identification"][1]["IDValue"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues
        if u["MarketRent"].present?
          unit.effective_rent = u["MarketRent"]
        elsif u["EffectiveRent"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
        end
        unit.floor = u["FloorLevel"]
        if u["Availability"]["VacancyClass"] == "Vacant"
          unit.availability = "Unoccupied"
          unit.available = true
        else
          unit.availability = "Occupied"
          unit.available = false
        end
        if u["Availability"]["VacancyClass"] == "Vacant"
          year = u["Availability"]["VacateDate"]["Year"]
          month = u["Availability"]["VacateDate"]["Month"]
          day = u["Availability"]["VacateDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        end
        unit.available_date = vacateDate
        building = u["BuildingID"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.manually_updated = false

        unit.save(validate: false)
      end
    end


  end

  def save_zaremba_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"])
      if floorplan.count > 1
        floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"],square_feet: f["SquareFeet"]["Min"],bedrooms: f["Room"][0]["Count"],bathrooms: f["Room"][1]["Count"])
      end
      if floorplan.present?
        floorplan = floorplan.first
        floorplan.property_id = property_id
        floorplan.provider = "zaremba_new"
        floorplan.provider_floorplan_id = f["IDValue"]
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
            floorplan.bedrooms = rt["Count"]
          else
            floorplan.bathrooms = rt["Count"]
          end
        end
        if f["SquareFeet"]["Min"].to_f > 0
          floorplan.square_feet = f["SquareFeet"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["Max"]
        end
        if f["MarketRent"]["Min"].to_f > 0
          floorplan.market_rent = f["MarketRent"]["Min"]
        else
          floorplan.market_rent = f["MarketRent"]["Max"]
        end
        floorplan.save
      else
        dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: f["IDValue"])
        if dup.present?
          dup.destroy
        end
        floorplan = Floorplan.new
        floorplan.property_id = property_id
        floorplan.provider = "zaremba_new"
        floorplan.community_id = credentials.community_id
        floorplan.provider_floorplan_id = f["IDValue"]
        floorplan.name = f["Name"]
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
            floorplan.bedrooms = rt["Count"]
          else
            floorplan.bathrooms = rt["Count"]
          end
        end
        if f["SquareFeet"]["Min"].to_f > 0
          floorplan.square_feet = f["SquareFeet"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["Max"]
        end
        if f["MarketRent"]["Min"].to_f > 0
          floorplan.market_rent = f["MarketRent"]["Min"]
        else
          floorplan.market_rent = f["MarketRent"]["Max"]
        end
        floorplan.save!
        floorplan.errors.full_messages.join(',')
      end
    end


  end

  def save_zaremba_single_floorplans(floorplans,property_id)

    floorplan = Floorplan.where(community_id: credentials.community_id,name: floorplans["Name"]).first
    if floorplan.present?
      floorplan.property_id = property_id
      floorplan.provider = "zaremba_new"
      floorplan.provider_floorplan_id = floorplans["IDValue"]
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
          floorplan.bedrooms = rt["Count"]
        else
          floorplan.bathrooms = rt["Count"]
        end
      end
      if floorplans["SquareFeet"]["Min"].to_f > 0
        floorplan.square_feet = floorplans["SquareFeet"]["Min"]
      else
        floorplan.square_feet = floorplans["SquareFeet"]["Max"]
      end
      if floorplans["MarketRent"]["Min"].to_f > 0
        floorplan.market_rent = floorplans["MarketRent"]["Min"]
      else
        floorplan.market_rent = floorplans["MarketRent"]["Max"]
      end
      floorplan.save
    else
      dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: floorplans["IDValue"])
      if dup.present?
        dup.destroy
      end
      floorplan = Floorplan.new
      floorplan.property_id = property_id
      floorplan.provider = "zaremba_new"
      floorplan.community_id = credentials.community_id
      floorplan.provider_floorplan_id = floorplans["IDValue"]
      floorplan.name = floorplans["Name"]
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
          floorplan.bedrooms = rt["Count"]
        else
          floorplan.bathrooms = rt["Count"]
        end
      end
      if floorplans["SquareFeet"]["Min"].to_f > 0
        floorplan.square_feet = floorplans["SquareFeet"]["Min"]
      else
        floorplan.square_feet = floorplans["SquareFeet"]["Max"]
      end
      if floorplans["MarketRent"]["Min"].to_f > 0
        floorplan.market_rent = floorplans["MarketRent"]["Min"]
      else
        floorplan.market_rent = floorplans["MarketRent"]["Max"]
      end
      floorplan.save!
      floorplan.errors.full_messages.join(',')
    end



  end
  def rename_provider
    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      unless d.provider == "zaremba_new"
        d.destroy
      end
    end
    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      unless d.provider == "zaremba_new" || d.provider == "manually"
        d.destroy
      end
    end
    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      if d.provider == "zaremba_new"
        d.provider = "zaremba"
        d.save(validate: false)
      end
    end

    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      if d.provider == "zaremba_new"
        d.provider = "zaremba"
        d.save(validate: false)
      end
    end
  end
end