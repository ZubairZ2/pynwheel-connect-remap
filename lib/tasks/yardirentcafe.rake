namespace :provider do

  desc 'fetch units data from yardirentcafe'
  task :yardirentcafe_units => :environment do

    #below response is for apartmentavailability.
    request_type = "apartmentavailability"
    company_code = "C00000077105"
    property_code = "p0223331"
    community_id = 2
    response = HTTParty.get("https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1")
    response = JSON.parse(response.body)
    # if  Unit.where(provider: "yardirentcafe",community_id: 1).count > 0
    #   Unit.where(provider: "yardirentcafe",community_id: 1).destroy_all
    # end
    response.each do |r|
      puts '-----------------' , r

      #unit = Unit.new(provider: "yardirentcafe",community_id: 1)
      unit = Unit.where(provider: "yardirentcafe",community_id: community_id,provider_unit_id: r["ApartmentId"]).first_or_initialize
      #unit.provider_unit_id = r["ApartmentId"]
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
        #Amenity.where(unit_id: unit.id).destroy_all
        amenities = r["Amenities"]
        puts '*********************** a' , amenities.inspect
        if amenities.index("^") == nil
          amenity = Amenity.where(unit_id: unit.id).first_or_initialize
          amenity.provider_amenity_id = amenities
          amenity.save
          puts '*********************** u' , amenity
        else
          amenities = amenities.split("^")
          amenities.each do |a|
            amenity = Amenity.where(unit_id: unit.id).first_or_initialize
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
    request_type = "floorplan"
    company_code = "C00000077105"
    property_code = "p0223331"
    community_id = 2
    response = HTTParty.get("https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1")
    response = JSON.parse(response.body)
    # if  Floorplan.where(provider: "yardirentcafe",community_id: 1).count > 0
    #   Floorplan.where(provider: "yardirentcafe",community_id: 1).destroy_all
    # end
    response.each do |r|
      puts '-----------------' , r
      #fp = Floorplan.new(provider: "yardirentcafe",community_id: 1)
      fp = Floorplan.where(provider: "yardirentcafe",community_id: community_id,provider_floorplan_id: r["FloorplanId"]).first_or_initialize
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


  def set_availabilty_date(available_date)
    available_date = available_date.split("/")
    "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
  end
end