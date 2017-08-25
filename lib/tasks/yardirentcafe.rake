namespace :provider do

  desc 'fetch units data from yardirentcafe'
  task :yardirentcafe_units => :environment do

    #below response is for apartmentavailability.
    response = HTTParty.get('https://api.rentcafe.com/rentcafeapi.aspx?requestType=apartmentavailability&companyCode=C00000077105&propertycode=p0223331&showallunit=-1')
    response = JSON.parse(response.body)
    if  Unit.where(provider: "yardirentcafe",community_id: 1).count > 0
      Unit.where(provider: "yardirentcafe",community_id: 1).destroy_all
    end
    response.each do |r|
      puts '-----------------' , r

      unit = Unit.new(provider: "yardirentcafe",community_id: 1)
      unit.provider_unit_id = r["ApartmentId"]
      unit.property_id = r["PropertyId"]
      unit.name = r["ApartmentName"]
      unit.number = r["ApartmentName"]
      unit.floorplan_id = r["FloorplanId"]
      unit.avg_rent = r["MinimumRent"]
      unit.min_rent = r["MinimumRent"]
      unit.max_rent = r["MaximumRent"]
      unit.availability = "Unoccupied"
      if r["AvailableDate"] != ""
        unit.availability = "Unoccupied"
        unit.available_date = Date.parse(set_availabilty_date(r["AvailableDate"]))
      else
        unit.availability = "Occupied"
        unit.available_date = Date.parse(set_availabilty_date("1/1/1999"))
      end
      unit.save!
      if r["Amenities"] != ""
        Amenity.where(unit_id: unit.id).destroy_all
        amenities = r["Amenities"]
        puts '*********************** a' , amenities.inspect
        if amenities.index("^") == nil
          amenity = Amenity.first_or_create(unit_id: unit.id)
          amenity.provider_amenity_id = amenities
          amenity.save
          puts '*********************** u' , amenity
        else
          amenities = amenities.split("^")
          amenities.each do |a|
            amenity = Amenity.first_or_create(unit_id: unit.id)
            amenity.provider_amenity_id = a
            amenity.save
            puts '*********************** l' , amenity
          end
        end
      end

    end
    puts '**********************', Unit.count
    #floorplan_response = HTTParty.get('https://api.rentcafe.com/rentcafeapi.aspx?requestType=floorplan&companyCode=C00000077105&propertycode=p0223331&showallunit=-1')
    #floorplan_response = JSON.parse(floorplan_response.body)
    #puts '**********************apartment availabilty*********************', response[0]
    #puts '******************floorplan**************', floorplan_response[0]
  end

  desc 'fetch floorplans data from yardirentcafe'
  task :yardirentcafe_floorplans => :environment do
    response = HTTParty.get('https://api.rentcafe.com/rentcafeapi.aspx?requestType=floorplan&companyCode=C00000077105&propertycode=p0223331&showallunit=-1')
    response = JSON.parse(response.body)
    if  Floorplan.where(provider: "yardirentcafe",community_id: 1).count > 0
      Floorplan.where(provider: "yardirentcafe",community_id: 1).destroy_all
    end
    response.each do |r|
      puts '-----------------' , r
      fp = Floorplan.new(provider: "yardirentcafe",community_id: 1)
      fp.property_id = r["PropertyId"]
      fp.provider_floorplan_id = r["FloorplanId"]
      fp.name = r["FloorplanName"]
      fp.unit_count = r[""]
      fp.units_available = r[""]
      fp.bedrooms = r["Beds"]
      fp.bathrooms = r["Baths"]
      if r["MinimumSQFT"].present?
          fp.square_feet = r["MinimumSQFT"]
      elsif r["SQFT"].present?
          fp.square_feet = r["SQFT"]
      end
      fp.market_rent = r["MinimumRent"]
      fp.deposit = r["MinimumDeposit"]
      fp.save
    end
    puts '**********************', Floorplan.count
  end

  desc 'fetch data from PSI(Entrata)'
  task :psi => :environment do
    #domain = "greystaradvantage"
    domain = "milestone"
    response = HTTParty.post("https://#{domain}.entrata.com/api/propertyunits",
      :body => {
          "auth": {
              "type": "basic",
              "password": "Password2017",
              "username": "pynwheel"
          },
          "method": {
              "name": "getMitsPropertyUnits",
              "params": {
                  "propertyIds": "491314",
                  "availableUnitsOnly": "0"
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
    save_units(units)
    save_floorplans(floorplans)
    fill_pricing_details
    # TODO Amenities
    # resp = response['response']['result']["PhysicalProperty"]["Property"][0]["ILS_Unit"][0]["Amenity"]
    # puts '*******', resp
  end

  def save_units(units)
    units.each do |u|
      unit = Unit.new(provider: "psi",community_id: 2)
      unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.property_id = "168925"
      unit.name = u["Units"]["Unit"]["UnitType"]
      unit.number = u["Units"]["Unit"]["MarketingName"].to_i

      unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
      unit.avg_rent = u["Units"]["Unit"]["MarketRent"]
      unit.min_rent = u["EffectiveRent"].present? ? u["EffectiveRent"] : 0.0
      unit.max_rent = u["EffectiveRent"].present? ? u["EffectiveRent"] : 0.0
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

  def save_floorplans(floorplans)
    floorplans.each do |f|

      floorplan = Floorplan.new(provider: "psi",community_id: 2)
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
    response = HTTParty.post("https://#{domain}.entrata.com/api/propertyunits",
                             :body => {
                                 "auth": {
                                     "type": "basic",
                                     "password": "Password2017",
                                     "username": "pynwheel"
                                 },
                                 "method": {
                                     "name": "getUnitsAvailabilityAndPricing",
                                     "params": {
                                         "propertyId": "491314",
                                         "availableUnitsOnly": "0"
                                     }
                                 }
                             }.to_json,
                             :headers => { 'Content-Type' => 'application/json' } )
    response =  JSON.parse(response.body)

    psi_units = response["response"]["result"]["ILS_Units"]["Unit"]
    psi_units.each do |u|
      unit_no = u[1]["@attributes"]["UnitNumber"].to_i
      unit = Unit.where(number: unit_no,provider_unit_id: u[1]["@attributes"]["PropertyUnitId"])
      if unit.present?
        unit = unit.first
          if u[1]["Rent"]["@attributes"]["MinRent"].to_f > 0 and u[1]["Rent"]["@attributes"]["MaxRent"].to_f > 0
            puts '*****************************', u[1]["Rent"]["@attributes"]["MinRent"]
            unit.update_attribute(:min_rent,u[1]["Rent"]["@attributes"]["MinRent"].gsub(",",""))
          end
        end
    end
  end

  def set_availabilty_date(available_date)
    available_date = available_date.split("/")
    "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
  end
end