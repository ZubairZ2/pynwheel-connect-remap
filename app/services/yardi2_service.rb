class Yardi2Service < BaseService
	def perform
      begin
  		  url = credentials.url
        arr = url.split('/')
  	    post = "#{arr[3]}/Webservices/itfilsguestcard20.asmx HTTP/1.1"
  	    host = arr[2]
  	    soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20/UnitAvailability_Login'
  	    user_name = credentials.username
  	    password = credentials.password
  	    server_name = credentials.server_name
  	    database = credentials.database
  	    platform = credentials.platform
  	    property_id = credentials.property_id
  	    interface_entity = credentials.interface_entity
  	    license_key = YARDI_LICENSE_KEY
  	    response = HTTParty.post(
  	          url,
  	          :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
  	          :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
  	    result = Hash.from_xml(response.body)
        unless result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["Messages"].present?
    	    ils_units = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["ILS_Unit"]
    	    floorplans = result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["Floorplan"]
    	    property_id =  result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["PhysicalProperty"]["Property"]["PropertyID"]["Identification"]["PrimaryID"]
    	    save_yardi2_units(ils_units,property_id)
    	    save_yardi2_floorplans(floorplans)
        else
          Thread.current[:errors] << result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["Messages"]["Message"]  
        end
      rescue => e
        Thread.current[:errors] << e.message
      end
	end

	def save_yardi2_units(ils_units,property_id)
      ils_units.each do |u|
      unit = Unit.where(provider: "yardi",community_id: credentials.community_id,provider_unit_id: u["Id"]).first_or_initialize  
      #unit = Unit.new(provider: "yardi2",community_id: credentials.communty_id)
      unit.property_id = property_id
      #unit.provider_unit_id = u["Id"]
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
      fp = Floorplan.where(provider: "yardi",community_id: credentials.community_id,provider_floorplan_id: f["Id"]).first_or_initialize  
      #fp = Floorplan.new(provider: "yardi2",community_id: credentials.communty_id)
      #fp.provider_floorplan_id = f["Id"]
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

end