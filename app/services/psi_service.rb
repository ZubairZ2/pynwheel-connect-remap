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
              # puts '***********', ils
            end
            pro["Floorplan"].each do |f|
              floorplans << f
            end
          end
          save_psi_units(units,property_id)
          save_psi_floorplans(floorplans,property_id)
        else
          Thread.current[:errors] <<  response["response"]["error"]["message"]  
        end
    rescue => e
      Thread.current[:errors] << e.message
    end
    fill_psi_pricing_details if Thread.current[:errors].empty?
	end

	def save_psi_units(units,property_id)
	  units.each do |u|
      unit = Unit.where(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"]).first_or_initialize
	    #unit = Unit.new(provider: "psi",community_id: credentials.community_id)
	    #unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
	    unit.property_id = property_id
	    unit.unit_type = u["Units"]["Unit"]["UnitType"]
	    unit.marketing_name = u["Units"]["Unit"]["MarketingName"].to_i

	    unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
	    unit.market_rent = u["Units"]["Unit"]["MarketRent"]
	    unit.effective_rent = u["EffectiveRent"].present? ? u["EffectiveRent"] : 0.0
	    unit.availability = u["Availability"]["VacancyClass"]
	    if u["Availability"]["VacateDate"].present?
	      if  u["Availability"]["VacateDate"]["@year"].present?
	          vacateDate = new Date(u["Availability"]["VacateDate"]["@year"],u["Availability"]["VacateDate"]["@month"],u["Availability"]["VacateDate"]["@day"])
	      elsif u["Availability"]["VacateDate"].present? and u["Availability"]["VacateDate"]["@Year"].present?
	          vacateDate = new Date(u["Availability"]["VacateDate"]["@Year"],u["Availability"]["VacateDate"]["@Month"],u["Availability"]["VacateDate"]["@Day"])
	      end
	    end
	    unless vacateDate.present?
	      vacateDate = Date.parse("2999-01-01")
	    end
	    if u["Units"]["Unit"]["UnitOccupancyStatus"] == "occupied" && u["Availability"]["VacancyClass"] == "Occupied"
	      unit.available_date = Date.parse("2999-01-01")
	      unit.availability = "Occupied"
	    else
	      if vacateDate.present?
	        if unit.availability == "Occupied" && vacateDate < Date.today
	          unit.available_date = Date.parse("2999-01-01")
	        else
	          unit.available_date = vacateDate
	        end
	      else
	        unit.available_date = Date.parse("2999-01-01")
	      end
	    end
	    building = u["Units"]["Unit"]["BuildingName"]
	    unit.building = building.present? ? building.gsub("Building ", "") : ""
	    unit.save
	 end
  end

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"]).first_or_initialize  
      #floorplan = Floorplan.new(provider: "psi",community_id: credentials.community_id)
      floorplan.property_id = property_id
      #floorplan.provider_floorplan_id = f["Identification"]["IDValue"]
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
          unit_no = u[1]["@attributes"]["UnitNumber"].to_i
          unit = Unit.where(marketing_name: unit_no,provider_unit_id: u[1]["@attributes"]["PropertyUnitId"])
          if unit.present?
            unit = unit.first
            if u[1]["Rent"]["@attributes"]["MinRent"].to_f > 0 and u[1]["Rent"]["@attributes"]["MaxRent"].to_f > 0
              puts '*****************************', u[1]["Rent"]["@attributes"]["MinRent"]
              unit.update_attribute(:effective_rent,u[1]["Rent"]["@attributes"]["MinRent"].gsub(",",""))
            end
          end
        end
      else
        Thread.current[:errors] << response["response"]["error"]["message"]  
      end
    rescue => e
      Thread.current[:errors] << e.message
    end
  end
end