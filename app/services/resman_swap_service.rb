class ResmanSwapService < BaseService
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
        # response =  JSON.parse(response.body)
        if response["ResMan"]["Status"] == "Success"
          units = []
          floorplans = []
          response["ResMan"]["Response"]["PhysicalProperty"]["Property"]["ILS_Unit"].each do |pro|
            units << pro
          end

          response["ResMan"]["Response"]["PhysicalProperty"]["Property"]["Floorplan"].each do |pro|
            floorplans << pro
          end
          save_resman_units(units,property_id)
          save_resman_floorplans(floorplans,property_id)
          # save_website_column_of_community(response)
          rename_provider
        else
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end
  def save_resman_units(units,property_id)
    units.each do |u|
      vacateDate = ""

      unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Id"])
      if unit.count > 1
        unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Id"], floorplan_id: Floorplan.find_by(name: u["Unit"]["MITS:Information"]["MITS:FloorplanName"]).provider_floorplan_id)
      end
      if unit.count > 1
        unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Id"], building: u["Unit"]["MITS:Information"]["MITS:BuildingID"].present? ? u["Unit"]["MITS:Information"]["MITS:BuildingID"] : "")
      end
      if unit.present?
        unit = unit.first
        unit.provider = "resman_new"
        unit.provider_unit_id = u["Id"].gsub('*','-')
        unit.lease_pricing = nil
        unit.property_id = property_id
        unit.unit_type = u["Unit"]["MITS:Information"]["MITS:UnitType"]
        unit_status_update(unit, u)
        # unit.marketing_name = u["Id"]
        unit.floorplan_id = u["Unit"]["MITS:Information"]["MITS:FloorPlanID"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues
        
        if u["Unit"]["MITS:Information"]["MITS:MarketRent"].present?
          unit.effective_rent = u["Unit"]["MITS:Information"]["MITS:MarketRent"]
        elsif u["EffectiveRent"].present? && u["EffectiveRent"]["Avg"].present?
          unit.effective_rent = u["EffectiveRent"]["Avg"]
        end

        unit.floor = u["FloorLevel"]
        if u["Availability"].present?
          unit.availability = "Unoccupied"
          year = u["Availability"]["MadeReadyDate"]["Year"]
          month = u["Availability"]["MadeReadyDate"]["Month"]
          day = u["Availability"]["MadeReadyDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
          unit.available = true
        else
          unit.availability = "Occupied"
          unit.available = false
        end
        unit.available_date = vacateDate
        building = u["Unit"]["MITS:Information"]["MITS:BuildingID"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.manually_updated = false
        unit.save(validate: false)
      else
        dup = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["Id"].gsub('*','-'))
        if dup.present?
          dup.destroy
        end

        unit = Unit.new
        unit.community_id = credentials.community_id
        unit.provider = "resman_new"
        unit.provider_unit_id = u["Id"].gsub('*','-')
        unit.lease_pricing = nil
        unit.property_id = property_id
        unit.unit_type = u["Unit"]["MITS:Information"]["MITS:UnitType"]
        unit_status_update(unit, u)
        unit.marketing_name = u["Id"]
        unit.floorplan_id = u["Unit"]["MITS:Information"]["MITS:FloorPlanID"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues

        if u["Unit"]["MITS:Information"]["MITS:MarketRent"].present?
          unit.effective_rent = u["Unit"]["MITS:Information"]["MITS:MarketRent"]
        elsif u["EffectiveRent"].present? && u["EffectiveRent"]["Avg"].present?
          unit.effective_rent = u["EffectiveRent"]["Avg"]
        end

        unit.floor = u["FloorLevel"]
        if u["Availability"].present?
          unit.availability = "Unoccupied"
          year = u["Availability"]["MadeReadyDate"]["Year"]
          month = u["Availability"]["MadeReadyDate"]["Month"]
          day = u["Availability"]["MadeReadyDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        else
          unit.availability = "Occupied"
        end
        unit.available_date = vacateDate
        building = u["Unit"]["MITS:Information"]["MITS:BuildingID"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.manually_updated = false
        unit.save(validate: false)
      end
    end
  end

  def save_resman_floorplans(floorplans,property_id)
    floorplans.each do |f|

      floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"])
      if floorplan.count > 1
        floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"],bedrooms: f["Room"][0]["Count"],bathrooms: f["Room"][1]["Count"],square_feet: f["SquareFeet"]["Min"])
      end
      if floorplan.present?
        floorplan = floorplan.first
        floorplan.property_id = property_id
        # floorplan.name = f["Name"]
        floorplan.provider_floorplan_id = f["Id"]
        floorplan.provider = "resman_new"
        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["Value"] rescue 0.0
        if f["FloorplanAvailabilityURL"].present?
          floorplan.availability_url = f["FloorplanAvailabilityURL"]
        end
        room_types = f["Room"]
        room_types.each do |rt|
          if rt["Type"] == "Bedroom"
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
        dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: f["Id"])
        if dup.present?
          dup.destroy
        end

        floorplan = Floorplan.new
        floorplan.community_id = credentials.community_id
        floorplan.property_id = property_id
        floorplan.name = f["Name"]

        floorplan.provider_floorplan_id = f["Id"]
        floorplan.provider = "resman_new"
        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["Value"] rescue 0.0
        if f["FloorplanAvailabilityURL"].present?
          floorplan.availability_url = f["FloorplanAvailabilityURL"]
        end
        room_types = f["Room"]
        room_types.each do |rt|
          if rt["Type"] == "Bedroom"
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
        # puts "]]]]]]]]]]", floorplan.errors.full_message.join(',')
      end
    end



  end

  def rename_provider
    Floorplan.where(community_id: credentials.community_id).where.not(provider: "resman_new").destroy_all
    Floorplan.where(community_id: credentials.community_id).where(provider: "resman_new").update_all(provider: "resman")
    Unit.where(community_id: credentials.community_id).where.not(provider: ["resman_new", "manually"]).destroy_all
    Unit.where(community_id: credentials.community_id).where(provider: "resman_new").update_all(provider: "resman")
  end

  def unit_status_update(unit, u)
    vacancy_class = u.dig("Availability", "VacancyClass") || u.dig("Unit", "MITS:Information", "MITS:UnitOccupancyStatus")
  
    unit.unit_status = if %w[unoccupied vacant].include?(vacancy_class.downcase)
                         "Unoccupied"
                       else
                         "Occupied"
                       end
  end
end