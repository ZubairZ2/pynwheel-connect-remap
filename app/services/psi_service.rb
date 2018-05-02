class PsiService < BaseService
	def perform
    begin
        url = credentials.url
        password = credentials.password
        username = credentials.username
        property_id = credentials.property_id
        response = HTTParty.post(url,
                               :body => {
                                   "auth": {
                                   "type": "basic",
                                   "password": password,
                                   "username": username
                               },
                               "method": {
          "name": "getMitsPropertyUnits",
          "params": {
              "propertyIds": property_id,
          "availableUnitsOnly": "0"
        }
        }
        }.to_json,
        :headers => { 'Content-Type' => 'application/json' } )
        response =  JSON.parse(response.body)
        if response["response"]["code"] == 200
          units = []
          floorplans = []
          response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
            pro["ILS_Unit"].each do |ils|
              units << ils
            end
            pro["Floorplan"].each do |f|
              floorplans << f
            end
          end
          save_psi_units(units,property_id)
          save_psi_floorplans(floorplans,property_id)
          save_website_column_of_community(response)
        else
          puts '-----------------------------' , response["response"]["error"]["message"]
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
    rescue => e
      puts '----------------------------' , e.message
      ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
    end
    fill_psi_pricing_details
	end

	def save_psi_units(units,property_id)
	  units.each do |u|
      vacateDate = Date.parse("2099-01-01")
      unit = Unit.where(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"]).first_or_initialize
	    unit.property_id = property_id
	    unit.unit_type = u["Units"]["Unit"]["UnitType"]
	    unit.marketing_name = u["Units"]["Unit"]["MarketingName"].to_i

	    unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
	    unit.market_rent = u["Units"]["Unit"]["MarketRent"]
	    unit.effective_rent = u["EffectiveRent"].present? ? u["EffectiveRent"] : 0.0
	    unit.availability = u["Availability"]["VacancyClass"]
	    if u["Availability"]["VacancyClass"] == "Unoccupied"
        year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
        month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
        day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
        vacateDate = Date.parse("#{year}-#{month}-#{day}")
      end
      unit.available_date = vacateDate
	    building = u["Units"]["Unit"]["BuildingName"]
	    unit.building = building.present? ? building.gsub("Building ", "") : ""
	    unit.save(validate: false)
	 end
  end

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"]).first_or_initialize  
      floorplan.property_id = property_id
      floorplan.name = f["Name"]
      floorplan.unit_count = f["UnitsAvailable"]
      floorplan.units_available = f["DisplayedUnitsAvailable"]
      floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
      floorplan.file_url = f["File"][0]["Src"]

      room_types = f["Room"]
      room_types.each do |rt|
        if rt["@attributes"]["RoomType"] == "Bedroom"
          floorplan.bedrooms = rt["Count"]
        else
          floorplan.bathrooms = rt["Count"]
        end
      end

      if f["SquareFeet"]["@attributes"]["Min"].to_f > 0

        floorplan.square_feet = f["SquareFeet"]["@attributes"]["Min"]
      else


        floorplan.square_feet = f["SquareFeet"]["@attributes"]["Max"]
      end
      if f["MarketRent"]["@attributes"]["Min"].to_f > 0

        floorplan.market_rent = f["MarketRent"]["@attributes"]["Min"]
      else

        floorplan.market_rent = f["MarketRent"]["@attributes"]["Max"]
      end
      floorplan.save
    end
  end

  def fill_psi_pricing_details
    begin
      url = credentials.url
      password = credentials.password
      username = credentials.username
      property_id = credentials.property_id
      response = HTTParty.post(url,
                               :body => {
                                   "auth": {
                                   "type": "basic",
                                   "password": password,
                                   "username": username
                               },
                               "method": {
          "name": "getUnitsAvailabilityAndPricing",
          "params": {
              "propertyId": property_id,
          "availableUnitsOnly": "0"
      }
      }
      }.to_json,
      :headers => { 'Content-Type' => 'application/json' } )
      response =  JSON.parse(response.body)
     
      if response["response"]["code"] == 200
        psi_units = response["response"]["result"]["ILS_Units"]["Unit"]
        psi_units.each do |u|
          unit = Unit.find_by(provider_unit_id: u[1]["@attributes"]["PropertyUnitId"],community_id: credentials.community_id)
          if unit.present?
            if u[1]["Rent"]["@attributes"]["MinRent"].to_f > 0 and u[1]["Rent"]["@attributes"]["MaxRent"].to_f > 0
              u[1]['Rent']['TermRent'].each do |a|
                if a["@attributes"]["IsBestPrice"] == "true"
                  lease_term = a["@attributes"]["LeaseTerm"].split(" ")
                  unit.effective_rent = a["@attributes"]["Rent"].remove(',').to_f
                  unit.lease_term = lease_term[0]
                  unit.save(validate: false)
                end
              end
              
            end
          end
        end
      else 
        ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
      end
    rescue => e
      puts '----------------------------' , e.message
      ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
    end
  end

  def save_website_column_of_community(response)
    community = Community.find credentials.community_id
    community.update_attribute(:website,response['response']['result']["PhysicalProperty"]["Property"][0]["PropertyID"]["WebSite"])
  end


end