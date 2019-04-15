class Yardi4Service < BaseService
  def perform
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        external_property_id = ""
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
        property_id = property_id
        interface_entity = credentials.interface_entity
        license_key = YARDI_LICENSE_KEY

        if arr[3] == "65320maa"
          require 'httparty'
          options = {
              timeout: 15,
              http_proxyaddr: 'us-east-static-06.quotaguard.com',
              http_proxyport: '9293',
              http_proxyuser: 'REDACTED',
              http_proxypass: 'REDACTED'
          }
          soap_body = '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>'

          options.merge!(headers: {
              'POST'=>post,
              'HOST'=>host,
              'Content-Type'=>'text/xml; charset=utf-8',
              'SOAPAction'=>soap_action
          },
                         body: soap_body )

          response = HTTParty.post( url, options)
        else
          response = HTTParty.post(
              url,
              :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
              :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
        end

        # response = HTTParty.post(
        #   url,
        #   :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
        #   :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')

        #result = Hash.from_xml(response.body) # This method consumes a lot of memory on heroku
        result = Ox.load(response.body, mode: :hash)
        if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult].present?
          property_response = result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty][1][:Property]
          property_response.each do |pr|
            if pr.key?(:IDValue)
              external_property_id = pr[:IDValue]
            end
            if pr.key?(:Floorplan)
              floorplans << pr[:Floorplan]
            end
            if pr.key?(:ILS_Unit)
              ils_units << pr[:ILS_Unit]
            end
          end
          save_yardi4_floorplans(floorplans)
          save_yardi4_units(ils_units,external_property_id)
          #else
          #Thread.current[:errors] << "Invalid credentials.Please enter correct one and try again."
          puts "Invalid credentials.Please enter correct one and try again."
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: "Invalid credentials.Please enter correct one and try again.",community_id: credentials.community_id})
        end
      rescue => e
        puts '------------------------'*20 , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end
    

  def save_yardi4_units(ils_units,property_id)
    ils_units.lazy.each do |api_unit|
      u = api_unit[1]
      unit = Unit.find_by(provider: "yardi",community_id: credentials.community_id,provider_unit_id: u[:Units][:Unit][:Identification][0][:IDValue])#.first_or_initialize
      if unit.present?
        unless unit.manual_override
          unit.property_id = property_id
          #unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
          # unit.unit_type = u[:Units][:Unit][:Identification][0][:IDValue]
          # unit.marketing_name = u[:Units][:Unit][:Identification][0][:IDValue]
          # unit.floorplan_id = u[:Units][:Unit][:UnitType]
          unit.market_rent = u[:Units][:Unit][:MarketRent] #TODO u.AvgRent = Number(o.Units.Unit.MarketRent.toString());
          unit.effective_rent = u[:Units][:Unit][:MarketRent]
          # unit.floor = evaluate_floor(unit.marketing_name) rescue nil
          is_available = false
          vacate_date = ""
          api_unit.each do |unit_with_key|
            if unit_with_key.key?(:Availability)

              if unit_with_key[:Availability][:VacateDate][0][:Year].present? && unit_with_key[:Availability][:VacateDate][0][:Year].to_i > 0 && unit_with_key[:Availability][:VacateDate][0][:Month].to_i > 0 && unit_with_key[:Availability][:VacateDate][0][:Day].to_i > 0
                vacate_date = Date.parse("#{unit_with_key[:Availability][:VacateDate][0][:Year]}-#{unit_with_key[:Availability][:VacateDate][0][:Month]}-#{unit_with_key[:Availability][:VacateDate][0][:Day]}")
                is_available = unit_with_key[:Availability][:VacancyClass] == "Unoccupied" ? true : false
              end
              if unit_with_key[:Availability][:MadeReadyDate][0][:Year].present?
                vacate_date = Date.parse("#{unit_with_key[:Availability][:MadeReadyDate][0][:Year]}-#{unit_with_key[:Availability][:MadeReadyDate][0][:Month]}-#{unit_with_key[:Availability][:MadeReadyDate][0][:Day]}")
                is_available = unit_with_key[:Availability][:VacancyClass] == "Unoccupied" ? true : false
              end
              # if vacate_date <= Date.today && unit_with_key[:Availability][:VacancyClass] == "Unoccupied"
              #   is_available = true
              # elsif vacate_date >= Date.today
              #   is_available = true
              # end
            end
            if unit_with_key.key?(:EffectiveRent)
              unit.effective_rent = unit_with_key[:EffectiveRent][0][:Min].to_f > 0 ? unit_with_key[:EffectiveRent][0][:Min] : 1
            end

          end
          pr = api_unit[3]
          unitHash = Hash.new
          begin
            if pr[:Pricing].present?
              pr[:Pricing][:'MITS-OfferTerm'].each_with_index do |pricing,index|
                month = pricing[:DateRange][:StartDate][0][:Month]
                day = pricing[:DateRange][:StartDate][0][:Day]
                year = pricing[:DateRange][:StartDate][0][:Year]
                startDate = "#{day}/#{month}-#{year}"
                month = pricing[:DateRange][:EndDate][0][:Month]
                day = pricing[:DateRange][:EndDate][0][:Day]
                year = pricing[:DateRange][:EndDate][0][:Year]
                endDate =  "#{day}/#{month}-#{year}"

                hashData = {(pricing[:Term]) => [ pricing[:EffectiveRent], startDate, endDate ]}
                unitHash.merge! hashData
              end
            end
            unitHash = (unitHash.sort_by {|k, v| k.to_i}).to_h
            unit.lease_pricing = unitHash.to_s
          rescue
            unit.lease_pricing = nil
          end
          unit.availability = is_available ? "Unoccupied" : "Occupied"
          unit.available_date = vacate_date
          unit.save
        end
      end
    end
  end

  def save_yardi4_floorplans(floorplans)
    floorplans.lazy.each do |floorplan|
      fp = Floorplan.find_by(provider: "yardi",community_id: credentials.community_id,provider_floorplan_id: floorplan[0][:IDValue])#.first_or_initialize
      if fp.present?
        unless fp.manual_override
          # rooms = []
          floorplan.each do |f|

            # if f.key?(:Room)
            #   rooms << f
            # end
            #
            # if f.key?(:Name)
            #   fp.name = f[:Name]
            # end

            if f.key?(:MarketRent)
              if f[:MarketRent][0][:Min].to_f > 0
                fp.market_rent = f[:MarketRent][0][:Min]
              else
                fp.market_rent = f[:MarketRent][0][:Max]
              end
            end
            #
            # if f.key?(:SquareFeet)
            #   if f[:SquareFeet][0][:Min].to_f > 0
            #     fp.square_feet = f[:SquareFeet][0][:Min]
            #   else
            #     fp.square_feet = f[:SquareFeet][0][:Max]
            #   end
            # end

          end

          # rooms.each do |room|
          #   if room[:Room][0][:RoomType] == "Bedroom"
          #     fp.bedrooms = room[:Room][1][:Count]
          #   else
          #     fp.bathrooms = room[:Room][1][:Count]
          #   end
          # end
          #
          fp.save(validate: false)
        end
      end
    end
  end

end