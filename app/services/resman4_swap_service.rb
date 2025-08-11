class Resman4SwapService < BaseService
  def perform
    property_ids = credentials.resman_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin

        account_id = credentials.resman_account_id
        #property_id = credentials.property_id
        url = "#{ENV["RESMAN_BASE_URL"]}/GetMarketing4_0"
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

            save_resman_units(units, property_id)
            save_resman_floorplans(floorplans, property_id)
            rename_provider
          end
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
      
      unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Units"]["Unit"]["MarketingName"])
      
      if unit.count > 1
        unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Units"]["Unit"]["MarketingName"], floorplan_id: Floorplan.find_by(name: u["Units"]["Unit"]["FloorplanName"]).provider_floorplan_id)
      end
      
      if unit.count > 1
        unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Units"]["Unit"]["MarketingName"], building: u["Units"]["Unit"]["BuildingName"].present? ? u["Units"]["Unit"]["BuildingName"] : "")
      end

      if unit.present?
        unit = unit.first
        unit.provider = "resman_new"
        unit.provider_unit_id = u["IDValue"].gsub('*','-')
        unit_status_update(unit, u)
        unit.lease_pricing = get_unit_lease_prising(u)
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        # unit.marketing_name = u["Id"]
        unit.floorplan_id = u["Units"]["Unit"]["UnitType"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues

        if u["EffectiveRent"].present? && u["EffectiveRent"]["Min"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
        elsif u["Units"]["Unit"]["MarketRent"].present?
          unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
        end

        unit.floor = u["FloorLevel"]
        if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
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
        building = u["Units"]["Unit"]["BuildingName"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.manually_updated = false
        unit.save(validate: false)
      else
        dup = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["IDValue"].gsub('*','-'))
        if dup.present?
          dup.destroy
        end
        unit = Unit.new
        unit.community_id = credentials.community_id
        unit.provider = "resman_new"
        unit.provider_unit_id = u["IDValue"].gsub('*','-')
        unit_status_update(unit, u)
        unit.lease_pricing = get_unit_lease_prising(u)
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
        unit.floorplan_id = u["Units"]["Unit"]["UnitType"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues
       
        if u["EffectiveRent"].present? && u["EffectiveRent"]["Min"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
        elsif u["Units"]["Unit"]["MarketRent"].present?
          unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
        end

        unit.floor = u["FloorLevel"]
        if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
          unit.availability = "Unoccupied"
          year = u["Availability"]["MadeReadyDate"]["Year"]
          month = u["Availability"]["MadeReadyDate"]["Month"]
          day = u["Availability"]["MadeReadyDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        else
          unit.availability = "Occupied"
        end
        unit.available_date = vacateDate
        building = u["Units"]["Unit"]["BuildingName"]
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
        floorplan.provider_floorplan_id = f["IDValue"]
        floorplan.provider = "resman_new"
        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["Exact"] rescue 0.0
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
      else
        dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: f["IDValue"])
        if dup.present?
          dup.destroy
        end

        floorplan = Floorplan.new
        floorplan.community_id = credentials.community_id
        floorplan.property_id = property_id
        floorplan.name = f["Name"]

        floorplan.provider_floorplan_id = f["IDValue"]
        floorplan.provider = "resman_new"
        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["Exact"] rescue 0.0
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

  def unit_status_update(unit, u)
    begin
      vacancy_class        = u.dig("Availability", "VacancyClass")
      occupancy_status     = u.dig("Units", "Unit", "UnitOccupancyStatus")
      leased_status        = u.dig("Units", "Unit", "UnitLeasedStatus")

      unit.unit_status =
        if vacancy_class == "Unoccupied" && occupancy_status == "vacant" && leased_status == "available"
          "Unoccupied"
        else
          "Occupied"
        end
    rescue StandardError
      unit.unit_status = "Occupied"
    end
  end
end