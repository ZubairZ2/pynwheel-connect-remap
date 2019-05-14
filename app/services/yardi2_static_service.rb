class Yardi2StaticService < BaseService
  def perform
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        sleep 3
        external_property_id = ""
        ils_units = []
        floorplans = []
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
        property_id = property_id
        interface_entity = credentials.interface_entity
        license_key = YARDI_LICENSE_KEY
        response = HTTParty.post(
            url,
            :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
            :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
        #result = Hash.from_xml(response.body) This method consumes a lot of memory on heroku
        result = Ox.load(response.body, mode: :hash)
        sleep 3
        if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult].present?
          property_response = result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty][1][:Property]
          property_response.each do |pr|
            sleep 3
            puts "================================================================================================================>----- ", pr[0].to_s
            if pr[0].to_s == "PropertyID"
              external_property_id  = pr[1][:"MITS:Identification"][1][:"MITS:PrimaryID"]
            end
            if pr[0].to_s == "Floorplan"
              floorplans << pr[1]
            end
            if pr[0].to_s == "ILS_Unit"
              ils_units << pr[1]
            end
          end
          # unitt = []
          #
          # result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty][1][:Property].each do |u|
          #   byebug
          #   if u[0].to_s == "Floorplan"
          #     floorplans << u[1]
          #   end
          #   if u[0].to_s == "ILS_Unit"
          #     ils_units << u[1]
          #   end
          # end

          save_yardi2_units(ils_units,external_property_id)
          save_yardi2_floorplans(floorplans)
          #else
          #puts '------------------------------------' , result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["Messages"]["Message"]
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: "Invalid credentials.Please enter correct one and try again.",community_id: credentials.community_id})
        end
      rescue => e
        puts '----------------------------------'*400, e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def save_yardi2_units(ils_units,property_id)
    ils_units[0].lazy.each do |unit_entries|
      begin
        unit = Unit.where(provider: "yardi",community_id: credentials.community_id,provider_unit_id: unit_entries[0][:Id]).first_or_initialize
        unless unit.manual_override
          unit.property_id = property_id
          unit.unit_type = unit_entries[0][:Id]
          unit.marketing_name = unit_entries[0][:Id]
          unit.floor = evaluate_floor(unit.marketing_name) rescue nil  ################
          is_available = false
          vacate_date = ""
          unit_entries.each do |u|
            if u.key?(:Unit)
              unit.floorplan_id = u[:Unit][:"MITS:Information"][:"MITS:UnitType"]
            end
            if u.key?(:EffectiveRent)
              unit.market_rent = u[:EffectiveRent][0][:Min]
              unit.effective_rent = u[:EffectiveRent][0][:Min]
            end
            if u.key?(:Availability)
              if u[:Availability][:VacateDate][0][:Year].present? and u[:Availability][:VacateDate][0][:Year] != '0'
                vacate_date = Date.parse("#{u[:Availability][:VacateDate][0][:Year]}-#{u[:Availability][:VacateDate][0][:Month]}-#{u[:Availability][:VacateDate][0][:Day]}")
                is_available = u[:Availability][:VacancyClass] == "Unoccupied" ? true : false
              end
              if u[:Availability][:MadeReadyDate][0][:Year].present? and u[:Availability][:MadeReadyDate][0][:Year] != '0'
                vacate_date = Date.parse("#{u[:Availability][:MadeReadyDate][0][:Year]}-#{u[:Availability][:MadeReadyDate][0][:Month]}-#{u[:Availability][:MadeReadyDate][0][:Day]}")
                is_available = u[:Availability][:VacancyClass] == "Unoccupied" ? true : false
              end
            end
          end
          unit.availability = is_available ? "Unoccupied" : "Occupied"
          if unit.availability = "Unoccupied"
            unit.available = true
          else
            unit.available = false
          end
          unit.available_date = vacate_date
          unit.manually_updated = false
          unit.save(validate: false)
        end
      rescue => e
        puts '----------------------------------', e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def save_yardi2_floorplans(floorplans)
    floorplans[0].lazy.each do |floorplan|
      begin
        fp = Floorplan.where(provider: "yardi",community_id: credentials.community_id,provider_floorplan_id: floorplan[0][:Id]).first_or_initialize
        unless fp.manual_override

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

          end

          rooms.each do |room|
            if room[:Room][0][:Type] == "Bedroom"
              fp.bedrooms = room[:Room][1][:Count]
            else
              fp.bathrooms = room[:Room][1][:Count]
            end
          end

          fp.save(validate: false)
        end
      rescue => e
        puts '----------------------------------', e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

end