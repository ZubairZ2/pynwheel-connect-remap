namespace :provider do
  desc 'fetch data from PSI(Entrata)'
  task :psi => :environment do
    #domain = "greystaradvantage"
    domain = "milestone"
    password = "Password2017"
    username = "pynwheel"
    @property_id = "491314"
    @community_id = 1
    response = HTTParty.post("https://#{domain}.entrata.com/api/propertyunits",
                             :body => {
                                 "auth": {
                                     "type": "basic",
                                     "password": password,
                                     "username": username
                                 },
                                 "method": {
                                     "name": "getMitsPropertyUnits",
                                     "params": {
                                         "propertyIds": @property_id,
                                         "availableUnitsOnly": credentials&.entrata_available_units_only
                                     }
                                 }
                             }.to_json,
                             :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)
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
    #save_units(units)
    #save_floorplans(floorplans)
    fill_pricing_details
    # TODO Amenities
    # resp = response['response']['result']["PhysicalProperty"]["Property"][0]["ILS_Unit"][0]["Amenity"]
    # puts '*******', resp
  end

  def save_units(units)
    units.each do |u|
      unit = Unit.new(provider: "psi",community_id: @community_id)
      vacateDate = Date.parse("2099-01-01")
      #unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
      #unit.property_id = @property_id
      #unit.name = u["Units"]["Unit"]["UnitType"]
      #unit.number = u["Units"]["Unit"]["MarketingName"].to_i

      #unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
      #unit.avg_rent = u["Units"]["Unit"]["MarketRent"]
      #unit.min_rent = u["EffectiveRent"].present? ? u["EffectiveRent"] : 0.0
      #unit.max_rent = u["EffectiveRent"].present? ? u["EffectiveRent"] : 0.0
      unit.availability = u["Availability"]["VacancyClass"]
      #puts ' -------------- - -start ----------------------'
      #puts '-------------------' , u["Availability"]["VacancyClass"]
      #puts '^^^^^^^^^^^^^^^^^^^' , u["Availability"]["VacateDate"]
      #puts '*******************' , u["Availability"]
      #puts ' -------------- - -end ----------------------'
      # if u["Availability"]["VacateDate"].present?
      #   if  u["Availability"]["VacateDate"]["@year"].present?
      #     vacateDate = new Date(u["Availability"]["VacateDate"]["@year"],u["Availability"]["VacateDate"]["@month"],u["Availability"]["VacateDate"]["@day"])
      #   elsif u["Availability"]["VacateDate"].present? and u["Availability"]["VacateDate"]["@Year"].present?
      #     vacateDate = new Date(u["Availability"]["VacateDate"]["@Year"],u["Availability"]["VacateDate"]["@Month"],u["Availability"]["VacateDate"]["@Day"])
      #   end
      # end
      # unless vacateDate.present?
      #   vacateDate = Date.parse("2999-01-01")
      # end
      # if u["Units"]["Unit"]["UnitOccupancyStatus"] == "occupied" && u["Availability"]["VacancyClass"] == "Occupied"
      #   unit.available_date = Date.parse("2099-01-01")
      #   unit.availability = "Occupied"
      # else
      #   if vacateDate.present?
      #     if unit.availability == "Occupied" && vacateDate < Date.today
      #       unit.available_date = Date.parse("2999-01-01")
      #     else
      #       unit.available_date = vacateDate
      #     end
      #   else
      #     unit.available_date = Date.parse("2999-01-01")
      #   end
      # end
      if u["Availability"]["VacancyClass"] == "Unoccupied"
        year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
        month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
        day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
        puts '----------------' , u["Availability"]["VacateDate"]["@attributes"]
        vacateDate = Date.parse("#{year}-#{month}-#{day}")
      end
      unit.available_date = vacateDate
      puts '----------------------------' , unit.available_date
      building = u["Units"]["Unit"]["BuildingName"]
      unit.building = building.present? ? building.gsub("Building ", "") : ""
      #unit.save
    end
  end

  def save_floorplans(floorplans)
    floorplans.each do |f|

      floorplan = Floorplan.new(provider: "psi",community_id: @community_id)
      floorplan.property_id = "168925"
      floorplan.provider_floorplan_id = f["Identification"]["IDValue"]
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

  def fill_pricing_details
    domain = "milestone"
    domain = "milestone"
    password = "Password2017"
    username = "pynwheel"
    @property_id = "491314"
    @community_id = 2
    response = HTTParty.post("https://#{domain}.entrata.com/api/propertyunits",
                             :body => {
                                 "auth": {
                                     "type": "basic",
                                     "password": password,
                                     "username": username
                                 },
                                 "method": {
                                     "name": "getUnitsAvailabilityAndPricing",
                                     "params": {
                                         "propertyId": @property_id,
                                         "availableUnitsOnly": credentials&.entrata_available_units_only
                                     }
                                 }
                             }.to_json,
                             :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

    psi_units = response["response"]["result"]["ILS_Units"]["Unit"]
    psi_units.each do |u|
      unit_no = u[1]["@attributes"]["UnitNumber"].to_i
      #unit = Unit.where(number: unit_no,provider_unit_id: u[1]["@attributes"]["PropertyUnitId"])
      #if unit.present?
        #unit = unit.first
        if u[1]["Rent"]["@attributes"]["MinRent"].to_f > 0 and u[1]["Rent"]["@attributes"]["MaxRent"].to_f > 0
          u[1]['Rent']['TermRent'].each do |a|
           
            if a["@attributes"]["IsBestPrice"] == "true"
              puts '-------------------------' , a["@attributes"]["Rent"]
              puts '*************************' , a["@attributes"]["LeaseTerm"]
              lease_term = a["@attributes"]["LeaseTerm"].split(" ")
              puts '----------*********-----------' , lease_term[0]
            end
          end
          
          #unit.update_column(:min_rent,u[1]["Rent"]["@attributes"]["MinRent"].gsub(",",""))
        end
      #end
    end
  end


end