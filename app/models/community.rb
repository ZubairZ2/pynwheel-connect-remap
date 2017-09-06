class Community < ApplicationRecord
  mount_uploader :logo, AvatarUploader
  belongs_to :company
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
  has_one :credential , dependent: :destroy
  accepts_nested_attributes_for :credential


  def data_is_imported
    case data_provider
      when "psi"
        import_psi_data
      when "yardirentcafe"
        import_yardirentcafe_data
      when "realpagesvc"
        import_realpage_svc_data
      when "yardi2"
        import_yardi2_data
      when "yardi4"
        import_yardi4_data
    end
  end

  def import_psi_data
    begin
      domain = credential.domain
      password = credential.password
      username = credential.username
      property_id = credential.property_id
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
              "propertyIds": property_id,
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
      save_psi_units(units,property_id)
      save_psi_floorplans(floorplans,property_id)
      fill_psi_pricing_details
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def save_psi_units(units,property_id)
    units.each do |u|
      unit = Unit.new(provider: "psi",community_id: id)
      unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.property_id = property_id
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

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|

      floorplan = Floorplan.new(provider: "psi",community_id: id)
      floorplan.property_id = property_id
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

  def fill_psi_pricing_details
    domain = credential.domain
    password = credential.password
    username = credential.username
    property_id = credential.property_id
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
            "propertyId": property_id,
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


  def import_yardirentcafe_data
    begin
      import_yardirentcafe_floorplans
      import_yardirentcafe_units
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def import_yardi2_data
    begin
      url = "https://#{credential.host}/#{credential.domain}/webservices/itfilsguestcard20.asmx"
      post = "#{credential.domain}/Webservices/itfilsguestcard20.asmx HTTP/1.1"
      host = credential.host
      soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20/UnitAvailability_Login'
      user_name = credential.username
      password = credential.password
      server_name = credential.server_name
      database = credential.database
      platform = credential.platform
      property_id = credential.property_id
      interface_entity = credential.interface_entity
      license_key = credential.licence_key
      response = HTTParty.post(
          url,
          :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
          :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
      result = Hash.from_xml(response.body)
      ils_units = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["ILS_Unit"]
      floorplans = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["Floorplan"]
      property_id =  result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["PropertyID"]["Identification"]["PrimaryID"]
      save_yardi2_units(ils_units,property_id)
      save_yardi2_floorplans(floorplans)
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def import_yardi4_data
    begin
      url = "https://#{credential.host}/#{credential.domain}/webservices/itfilsguestcard.asmx?wsdl"
      post = "#{credential.domain}/Webservices/itfilsguestcard.asmx HTTP/1.1"
      host = credential.host
      soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard/UnitAvailability_Login'
      user_name = credential.username
      password = credential.password
      server_name = credential.server_name
      database = credential.database
      platform = credential.platform
      property_id = credential.property_id
      interface_entity = credential.interface_entity
      license_key = credential.licence_key
      response = HTTParty.post(
          url,
          :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
          :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
      result = Hash.from_xml(response.body)

      ils_units = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["ILS_Unit"]
      floorplans = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["Floorplan"]
      property_id =  result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["PropertyID"]["Identification"]["PrimaryID"]
      save_yardi4_units(ils_units,property_id)
      save_yardi4_floorplans(floorplans)
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def save_yardi4_units(ils_units,property_id)
    ils_units.each do |u|
      unit = Unit.new(provider: "yardi4",community_id: id)
      unit.property_id = property_id
      unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.name = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.number = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.floorplan_id = u["Units"]["Unit"]["UnitType"]
      unit.avg_rent = 0 #TODO u.AvgRent = Number(o.Units.Unit.MarketRent.toString());
      unit.min_rent = u["Units"]["Unit"]["MarketRent"]
      unit.max_rent = u["Units"]["Unit"]["MarketRent"]

      is_available = false
      vacate_date = Date.today
      if u["Availability"].present?
        if u["Availability"]["VacateDate"]["Year"].present?
          vacate_date = Date.parse("#{u["Availability"]["VacateDate"]["Year"]}-#{u["Availability"]["VacateDate"]["Month"]}-#{u["Availability"]["VacateDate"]["Day"]}")
        end
        if u["Availability"]["MadeReadyDate"]["Year"].present?
          vacate_date = Date.parse("#{u["Availability"]["MadeReadyDate"]["Year"]}-#{u["Availability"]["MadeReadyDate"]["Month"]}-#{u["Availability"]["MadeReadyDate"]["Day"]}")
        end
        if vacate_date >= Date.today && u["Availability"]["VacancyClass"] == "Occupied"
          is_available = true
        else
          is_available = false
          vacate_date = Date.parse("2099-1-1")
        end
      else
        is_available = false
        vacate_date = Date.parse("2099-1-1") #set a newer date 1/1/2099
      end
      unit.availability = is_available ? "Unoccupied" : "Occupied"
      unit.available_date = vacate_date
      unit.save
    end
  end

  def save_yardi4_floorplans(floorplans)
    floorplans.each do |f|
      fp = Floorplan.new(provider: "yardi4",community_id: 5)
      fp.provider_floorplan_id = f["IDValue"]
      rooms = f["Room"]
      rooms.each do |room|
        if room["RoomType"] == "Bedroom"
          fp.bedrooms = room["Count"]
        else
          fp.bathrooms = room["Count"]
        end
      end
      fp.name = f["Name"]
      if f["MarketRent"]["Min"].to_f > 0
        fp.market_rent = f["MarketRent"]["Min"]
      else
        fp.market_rent = f["MarketRent"]["Max"]
      end
      if f["SquareFeet"]["Min"].to_f > 0
        fp.square_feet = f["SquareFeet"]["Min"]
      else
        fp.square_feet = f["SquareFeet"]["Max"]
      end
      fp.unit_count = f["UnitCount"]
      fp.units_available = -1

      fp.save
    end
  end

  def save_yardi2_units(ils_units,property_id)
    ils_units.each do |u|
      unit = Unit.new(provider: "yardi2",community_id: id)
      unit.property_id = property_id
      unit.provider_unit_id = u["Id"]
      unit.name = u["Id"]
      unit.number = u["Id"]
      unit.floorplan_id = u["Unit"]["Information"]["UnitType"]
      unit.avg_rent = 0 #TODO u.AvgRent = Number(o.Units.Unit.MarketRent.toString());
      unit.min_rent = u["EffectiveRent"]["Min"]
      unit.max_rent = u["EffectiveRent"]["Max"]

      vacate_date = Date.today
      if u["Availability"].present?
        if u["Availability"]["VacateDate"]["Year"].present?
          vacate_date = Date.parse("#{u["Availability"]["VacateDate"]["Year"]}-#{u["Availability"]["VacateDate"]["Month"]}-#{u["Availability"]["VacateDate"]["Day"]}")
        end
        if u["Availability"]["MadeReadyDate"]["Year"].present?
          vacate_date = Date.parse("#{u["Availability"]["MadeReadyDate"]["Year"]}-#{u["Availability"]["MadeReadyDate"]["Month"]}-#{u["Availability"]["MadeReadyDate"]["Day"]}")
        end
        if vacate_date >= Date.today && u["Availability"]["VacancyClass"] == "Occupied"
          is_available = true
        else
          is_available = false
          vacate_date = Date.parse("2099-1-1")
        end
      else
        is_available = false
        vacate_date = Date.parse("2099-1-1") #set a newer date 1/1/2099
      end
      unit.availability = is_available ? "Unoccupied" : "Occupied"
      unit.available_date = vacate_date
      unit.save
    end
  end

  def save_yardi2_floorplans(floorplans)
    floorplans.each do |f|
      fp = Floorplan.new(provider: "yardi2",community_id: id)
      fp.provider_floorplan_id = f["Id"]
      rooms = f["Room"]
      rooms.each do |room|
        if room["Type"] == "Bedroom"
          fp.bedrooms = room["Count"]
        else
          fp.bathrooms = room["Count"]
        end
      end
      fp.name = f["Name"]
      if f["MarketRent"]["Min"].to_f > 0
        fp.market_rent = f["MarketRent"]["Min"]
      else
        fp.market_rent = f["MarketRent"]["Max"]
      end
      if f["SquareFeet"]["Min"].to_f > 0
        fp.square_feet = f["SquareFeet"]["Min"]
      else
        fp.square_feet = f["SquareFeet"]["Max"]
      end
      fp.unit_count = f["UnitCount"]
      fp.units_available = -1
      fp.save
    end
  end

  def import_realpage_svc_data
    begin
      import_realpage_svc_floorplans
      import_realpage_svc_units
      import_realpage_svc_price
    rescue => e
      puts '--------------' ,e.message
      false
    end
  end

  def import_yardirentcafe_floorplans
    request_type = "apartmentavailability"
    company_code = credential.domain
    property_code = credential.property_id

    response = HTTParty.get("https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1")
    response = JSON.parse(response.body)

    response.each do |r|
      puts '-----------------' , r


      unit = Unit.where(provider: "yardirentcafe",community_id: id,provider_unit_id: r["ApartmentId"]).first_or_initialize

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
  end

  def import_yardirentcafe_units
    request_type = "floorplan"
    company_code = credential.domain
    property_code = credential.property_id

    response = HTTParty.get("https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1")
    response = JSON.parse(response.body)

    response.each do |r|
      puts '-----------------' , r
      #fp = Floorplan.new(provider: "yardirentcafe",community_id: 1)
      fp = Floorplan.where(provider: "yardirentcafe",community_id: id,provider_floorplan_id: r["FloorplanId"]).first_or_initialize
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
  end

  def set_availabilty_date(available_date)
    available_date = available_date.split("/")
    "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
  end


  def import_realpage_svc_floorplans
    url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
    soap_action = 'http://tempuri.org/IRPXService/getfloorplanlist'
    pmc_id = credential.pmc_id
    site_id = credential.property_id
    username = credential.username
    password = credential.password
    license_key = credential.licence_key
    community_id = id
    response = HTTParty.post(
        url,
        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
        :body => '<soapenv:Envelope
	xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
	xmlns:tem="http://tempuri.org/"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xmlns:xsd="http://www.w3.org/2001/XMLSchema">
	<soapenv:Header/>
	<soapenv:Body>

		<tem:getfloorplanlist>
			<tem:auth>
				<tem:pmcid>'+pmc_id+'</tem:pmcid>
				<tem:siteid>'+site_id+'</tem:siteid>
				<tem:username>'+username+'</tem:username>
				<tem:password>'+password+'</tem:password>
				<tem:licensekey>'+license_key+'</tem:licensekey>
				<tem:system>OneSite</tem:system>
			</tem:auth>
		</tem:getfloorplanlist>

	</soapenv:Body>
</soapenv:Envelope>
'
    )

    result = Hash.from_xml(response.body)

    floorplans = result["Envelope"]["Body"]["getfloorplanlistResponse"]["getfloorplanlistResult"]["GetFloorPlanList"]["FloorPlanObject"]

    floorplans.each do |fp|
      floorplan = Floorplan.new(provider: "realpagesvc",community_id: community_id)
      floorplan.provider_floorplan_id = fp["FloorPlanID"]
      if fp["FloorPlanNameMarketing"].present?
        floorplan.name = fp["FloorPlanNameMarketing"]
      elsif fp["FloorPlanCode"].present?
        if fp["FloorPlanCode"] != fp["FloorPlanName"]
          floorplan.name = fp["FloorPlanCode"] + " - " + fp["FloorPlanName"]
        else
          floorplan.name = fp["FloorPlanCode"] + " - " + fp["FloorPlanNameMarketing"]
        end
      else
        floorplan.name = fp["FloorPlanName"]
      end
      floorplan.bathrooms = fp["Bathrooms"]
      floorplan.bedrooms = fp["Bedrooms"]
      floorplan.market_rent = fp["RentMin"]
      floorplan.square_feet = fp["GrossSquareFootage"]
      floorplan.unit_count = -1
      floorplan.units_available = -1
      floorplan.deposit = 0
      floorplan.file_url = ""
      floorplan.save
    end
  end

  def import_realpage_svc_units
    building_result = realpage_building
    url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
    soap_action = 'http://tempuri.org/IRPXService/getunitsbyproperty'
    pmc_id = credential.pmc_id
    site_id = credential.property_id
    username = credential.username
    password = credential.password
    license_key = credential.licence_key
    community_id = id
    response = HTTParty.post(
        url,
        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
        :body => '<soapenv:Envelope
                      xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:tem="http://tempuri.org/"
                      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                      xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                      <soapenv:Header/>
                      <soapenv:Body>

                        <tem:getunitsbyproperty>
                          <tem:auth>
                            <tem:pmcid>'+pmc_id+'</tem:pmcid>
                            <tem:siteid>'+site_id+'</tem:siteid>
                            <tem:username>'+username+'</tem:username>
                            <tem:password>'+password+'</tem:password>
                            <tem:licensekey>'+license_key+'</tem:licensekey>
                            <tem:system>OneSite</tem:system>
                          </tem:auth>
                        </tem:getunitsbyproperty>

                      </soapenv:Body>
                    </soapenv:Envelope>
                    ')
    result = Hash.from_xml(response.body)
    units = result["Envelope"]["Body"]["getunitsbypropertyResponse"]["getunitsbypropertyResult"]["GetUnitsByProperty"]["UnitObject"]
    units.each do |u|
      unit = Unit.new(provider: "realpagesvc",community_id: community_id)
      unit.property_id = u["SiteID"]
      unit.provider_unit_id = u["UnitID"]
      unit.name = u["UnitNumber"]
      unit.number = u["UnitNumber"]
      unit.floorplan_id = u["FloorplanID"]
      unit.avg_rent = u["BaseRentAmount"]
      unit.min_rent = u["BaseRentAmount"]
      unit.max_rent = u["BaseRentAmount"]
      unit.availability = u["AvailableBit"] == "true" ? "Unoccupied" : "Occupied"
      if u["AvailableDate"].present?
        unit.available_date = u["AvailableDate"]
      end

      if u["MadeReadyDate"].present?
        unit.available_date = u["MadeReadyDate"]
      end
      if unit.available_date.year == 1900
        unit.available_date = Date.parse("2099-1-1") #set a newer date 1/1/2099
      end
      if unit.availability == "Occupied" && unit.available_date < Date.today
        unit.available_date = Date.parse("2099-1-1") #set a newer date 1/1/2099
      end
      unit.building = ""
      bldgResult = getBuildingNumber(u["BuildingID"],building_result)
      if bldgResult.present?
        if bldgResult == "N/A"
          unit.building = ""
        else
          unit.building = bldgResult
        end
      end
      unit.save
    end
  end

  def import_realpage_svc_price
    url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
    soap_action = 'http://tempuri.org/IRPXService/getunitlist'
    pmc_id = credential.pmc_id
    site_id = credential.property_id
    username = credential.username
    password = credential.password
    license_key = credential.licence_key
    community_id = id
    response = HTTParty.post(
        url,
        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
        :body => '<soapenv:Envelope
                      xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:tem="http://tempuri.org/"
                      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                      xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                      <soapenv:Header/>
                      <soapenv:Body>

                        <tem:getunitlist>
                          <tem:auth>
                            <tem:pmcid>'+pmc_id+'</tem:pmcid>
                            <tem:siteid>'+site_id+'</tem:siteid>
                            <tem:username>'+username+'</tem:username>
                            <tem:password>'+password+'</tem:password>
                            <tem:licensekey>'+license_key+'</tem:licensekey>
                            <tem:system>OneSite</tem:system>
                          </tem:auth>
                          <tem:listCriteria>
                            <tem:ListCriterion>
                              <tem:name>Limitresults</tem:name>
                              <tem:singlevalue>False</tem:singlevalue>
                            </tem:ListCriterion>
                            <tem:ListCriterion>
                              <tem:name>DateNeeded</tem:name>
                              <tem:singlevalue>'+Date.today.strftime("%Y-%m-%d") +'</tem:singlevalue>
                            </tem:ListCriterion>
                          </tem:listCriteria>
                          <tem:listCriteria>
                            <tem:name>LeaseTerms</tem:name>
                            <tem:singlevalue>12</tem:singlevalue>
                          </tem:listCriteria>
                        </tem:getunitlist>

                      </soapenv:Body>
                    </soapenv:Envelope>')
    result = Hash.from_xml(response.body)
    units = result["Envelope"]["Body"]["getunitlistResponse"]["getunitlistResult"]["GetUnitList"]["UnitObjects"]["UnitObject"]
    units.each do |u|
      unit_no = u["Address"]["UnitID"].to_i
      unit = Unit.where(provider: "realpagesvc",community_id: community_id, provider_unit_id: unit_no)
      puts " ----------- ", unit_no
      best_price = nil

      u["RentMatrix"]["Rows"]["Row"]["Options"].each do |opt|
        # units = result["Envelope"]["Body"]["getunitlistResponse"]["getunitlistResult"]["GetUnitList"]["UnitObjects"]["UnitObject"]["RentMatrix"]["Rows"]["Row"]["Options"]
        opt["Option"].each do |o|
          if o["Best"] == "true"
            best_price = o["Rent"]
          end
        end
      end
      if best_price.present? && unit.present?
        unit.first.update_attributes(min_rent: best_price)
        puts " **** price updated *** "
      end
      # puts "================================================================================================="
    end
  end

  def realpage_building
    url = "https://gateway.rpx.realpage.com/RPXGateway/partner/Pynwheel/Pynwheel.svc"
    soap_action = 'http://tempuri.org/IRPXService/getpicklist'
    pmc_id = credential.pmc_id
    site_id = credential.property_id
    username = credential.username
    password = credential.password
    license_key = credential.licence_key
    response = HTTParty.post(
        url,
        :headers => {"Content-Type" => "text/xml","Content-Length"=>'1993',"Accept"=>"text/xml","Cache-Control"=>"no-cache","Pragma"=>"no-cache","SOAPAction"=>soap_action},
        :body => '<soapenv:Envelope
                    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                    xmlns:tem="http://tempuri.org/"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                    <soapenv:Header/>
                    <soapenv:Body>

                      <tem:getpicklist>
                        <tem:auth>
                          <tem:pmcid>'+pmc_id+'</tem:pmcid>
                          <tem:siteid>'+site_id+'</tem:siteid>
                          <tem:username>'+username+'</tem:username>
                          <tem:password>'+password+'</tem:password>
                          <tem:licensekey>'+license_key+'</tem:licensekey>
                          <tem:system>OneSite</tem:system>
                        </tem:auth>
                        <tem:lType>LIST_BUILDING</tem:lType>
                      </tem:getpicklist>

                    </soapenv:Body>
                  </soapenv:Envelope>
                  ')
    result = Hash.from_xml(response.body)
    return result["Envelope"]["Body"]["getpicklistResponse"]["getpicklistResult"]["GetPickList"]["Contents"]["PicklistItem"]
  end

  def getBuildingNumber(building_no, building_result)
    if building_result["Value"] == building_no
      return building_result["Text"]
    else
      return ""
    end
  end

end
