class ResmanService < BaseService
  def perform
    property_ids = credentials.resman_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        apikey = credentials.resman_apikey
        partner_id = credentials.resman_partner_id
        account_id = credentials.resman_account_id
        #property_id = credentials.property_id
        url = "https://api.myresman.com/MITS/GetMarketing2_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey": apikey,
                                     "IntegrationPartnerID": partner_id,
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
        else
          puts '-----------------------------' , response["response"]["error"]["message"]
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end
  def save_resman_units(units,property_id)
    units.each do |u|
      vacateDate = ""
      unit = Unit.find_by(provider: "resman",community_id: credentials.community_id,provider_unit_id: u["Id"])#.first_or_initialize

      # unit.property_id = property_id
      # unit.unit_type = u["Unit"]["MITS:Information"]["MITS:UnitType"]
      # unit.marketing_name = u["Unit"]["MITS:MarketingName"]
      # unit.floorplan_id = u["Unit"]["MITS:Information"]["MITS:FloorPlanID"]
      unit.effective_rent = 1.0 #Setting rent to avoid validation issues
      if u["Unit"]["MITS:Information"]["MITS:MarketRent"].present?
        unit.effective_rent = u["Unit"]["MITS:Information"]["MITS:MarketRent"]
      elsif u["EffectiveRent"].present?
        unit.effective_rent = u["EffectiveRent"]["Avg"]
      end
      # unit.floor = u["FloorLevel"]
      if u["Availability"].present?
        unit.availability = "Unoccupied"
        year = u["Availability"]["VacateDate"]["Year"]
        month = u["Availability"]["VacateDate"]["Month"]
        day = u["Availability"]["VacateDate"]["Day"]
        vacateDate = Date.parse("#{year}-#{month}-#{day}")
      else
        unit.availability = "Occupied"
      end
      unit.available_date = vacateDate
      # building = u["Unit"]["MITS:Information"]["MITS:BuildingID"]
      # unit.building = building.present? ? building.gsub("Building ", "") : ""
      # unit.manually_updated = false
      unit.save(validate: false)
    end
  end

  def save_resman_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.find_by(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Id"])#.first_or_initialize

      # floorplan.property_id = property_id
      # floorplan.name = f["Name"]
      # floorplan.unit_count = f["UnitCount"]
      # floorplan.units_available = f["UnitsAvailable"]
      # floorplan.deposit = f["Deposit"]["Amount"]["Value"]
      # if f["FloorplanAvailabilityURL"].present?
      #   floorplan.availability_url = f["FloorplanAvailabilityURL"]
      # end
      # puts  f["FloorplanAvailabilityURL"]
      # room_types = f["Room"]
      # room_types.each do |rt|
      #   if rt["Type"] == "Bedroom"
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
      if f["MarketRent"]["Min"].to_f > 0
        floorplan.market_rent = f["MarketRent"]["Min"]
      else
        floorplan.market_rent = f["MarketRent"]["Max"]
      end
      floorplan.save

    end
  end

end