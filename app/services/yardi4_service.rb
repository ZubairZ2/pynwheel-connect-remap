class Yardi4Service < BaseService
	def perform
    begin
      property_id = ""
      ils_units = []
      floorplans = []
	    url = credentials.url
      arr = url.split('/')
      post = "/#{arr[3]}/Webservices/itfilsguestcard.asmx HTTP/1.1"
      host = arr[2]
      soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard/UnitAvailability_Login'
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
          :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
      #result = Hash.from_xml(response.body) # This method consumes a lot of memory on heroku
      result = Ox.load(response.body, mode: :hash)
      if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult].present?
        property_response = result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty][1][:Property]
        property_response.each do |pr|
          if pr.key?(:IDValue)
            property_id = pr[:IDValue]
          end
          if pr.key?(:Floorplan)
            floorplans << pr[:Floorplan]
          end
          if pr.key?(:ILS_Unit)
            ils_units << pr[:ILS_Unit]
          end
        end
        save_yardi4_units(ils_units,property_id)
        save_yardi4_floorplans(floorplans)
      else
        #Thread.current[:errors] << "Invalid credentials.Please enter correct one and try again."
        puts "Invalid credentials.Please enter correct one and try again."
        ExceptionNotifier.notify_exception(Exception.new,data: {message: "Invalid credentials.Please enter correct one and try again.",community_id: credentials.community_id})
      end
    rescue => e
      #Thread.current[:errors] << e.message
      puts '------------------------' , e.message
      ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
    end
	end
    

  def save_yardi4_units(ils_units,property_id)
    ils_units.lazy.each do |u|
      u = u[1]
      unit = Unit.where(provider: "yardi",community_id: credentials.community_id,provider_unit_id: u[:Units][:Unit][:Identification][0][:IDValue]).first_or_initialize   
      #unit = Unit.new(provider: "yardi4",community_id: credentials.community_id)
      unit.property_id = property_id
      #unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
      unit.unit_type = u[:Units][:Unit][:Identification][0][:IDValue]
      unit.marketing_name = u[:Units][:Unit][:Identification][0][:IDValue]
      unit.floorplan_id = u[:Units][:Unit][:UnitType]
      unit.market_rent = u[:Units][:Unit][:MarketRent] #TODO u.AvgRent = Number(o.Units.Unit.MarketRent.toString());
      unit.effective_rent = u[:Units][:Unit][:MarketRent]

      is_available = false
      vacate_date = Date.today
      if u[:Availability].present?
        if u[:Availability][:VacateDate][:Year].present? && u[:Availability][:VacateDate][:Year].to_i > 0 && u[:Availability][:VacateDate][:Month].to_i > 0 && u[:Availability][:VacateDate][:Day].to_i > 0
          vacate_date = Date.parse("#{u[:Availability][:VacateDate][:Year]}-#{u[:Availability][:VacateDate][:Month]}-#{u[:Availability][:VacateDate][:Day]}")
        end
        if u[:Availability][:MadeReadyDate][:Year].present?
          vacate_date = Date.parse("#{u[:Availability][:MadeReadyDate][:Year]}-#{u[:Availability][:MadeReadyDate][:Month]}-#{u[:Availability][:MadeReadyDate][:Day]}")
        end
        if vacate_date >= Date.today && u[:Availability][:VacancyClass] == "Occupied"
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
    floorplans.lazy.each do |floorplan|
      fp = Floorplan.where(provider: "yardi",community_id: credentials.community_id,provider_floorplan_id: floorplan[0][:IDValue]).first_or_initialize  
      rooms = []
      floorplan.each do |f|
        
        if f.key?(:Room)
          rooms << f
        end

        if f.key?(:Name)
          fp.name = f[:Name]
        end

        if f.key?(:MarketRent)
          if f[:MarketRent][0][:Min].to_f > 0
            fp.market_rent = f[:MarketRent][0][:Min]
          else
            fp.market_rent = f[:MarketRent][0][:Max]
          end
        end

        if f.key?(:SquareFeet)
          if f[:SquareFeet][0][:Min].to_f > 0
            fp.square_feet = f[:SquareFeet][0][:Min]
          else
            fp.square_feet = f[:SquareFeet][0][:Max]
          end
        end

        if f.key?(:UnitCount)
          fp.unit_count = f[:UnitCount]
        end

      end
      
      rooms.each do |room|
        if room[:Room][0][:RoomType] == "Bedroom"
          fp.bedrooms = room[:Room][1][:Count]
        else
          fp.bathrooms = room[:Room][1][:Count]
        end
      end
      
      fp.units_available = -1
      fp.save
    end
  end

end