class Yardi4Service < BaseService

  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
    return unless @credentials&.url.present?

    @unit_record = []
    @all_units_hash = ProvidersDataUpdationService.new().get_all_units_hash(@credentials.community_id, "yardi")
    @all_floorplans_hash = ProvidersDataUpdationService.new().get_all_floorplans_hash(@credentials.community_id, "yardi")
  end

  def perform  
    property_ids = @credentials.property_id.split(',') rescue []
    property_ids&.each do |property_id|
      begin
        external_property_id = ""
        ils_units = []
        floorplans = []
        url = @credentials.url
        arr = url.split('/')
        post = "/#{arr[3]}/Webservices/itfilsguestcard.asmx HTTP/1.1"
        host = arr[2]
        soap_action = 'http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard/UnitAvailability_Login'
        user_name = @credentials.username
        password = @credentials.password
        server_name = @credentials.server_name
        database = @credentials.database
        platform = @credentials.platform
        property_id = property_id&.strip
        interface_entity = @credentials.interface_entity
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

        result = Ox.load(response.body, mode: :hash)

        if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult].present?
          if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty].present?
            property_response = result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty][1][:Property]
            
            community = Community.find @credentials.community_id
            community&.community_data_updated_on()

            property_response&.each do |pr|
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
            save_yardi4_units(ils_units, external_property_id)
          end

          begin
            cred = Credential.find @credentials.id
            cred.data_error_message = nil
            PaperTrail.enabled = false
            cred.save
            PaperTrail.enabled = true
          rescue => err
            raise err
          end
        else
          begin
            cred = Credential.find @credentials.id
            cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
            PaperTrail.enabled = false
            cred.save
            PaperTrail.enabled = true
          rescue => err
            raise err
          end
        end
      rescue => e
        raise e

        begin
          cred = Credential.find @credentials.id
          cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
          PaperTrail.enabled = false
          cred.save
          PaperTrail.enabled = true
        rescue => err
          raise err
        end
      end
    end
  end
    

  def save_yardi4_units(ils_units, property_id)
    return unless @all_units_hash.present?
    import_units = []
    unit_present = @all_units_hash.keys

    ils_units&.each do |api_unit|

      u = api_unit[1]
      provider_unit_id = "#{u[:Units][:Unit][:Identification][0][:IDValue]}-#{property_id}" rescue "#{u[:Units][:Unit][:Identification][0][0][:IDValue]}-#{property_id}"
      unit = @all_units_hash[provider_unit_id]

      if unit.present?
        unit.property_id = property_id
        unit.market_rent = u[:Units][:Unit][:MarketRent]
        unit.unit_type = u[:Units][:Unit][:UnitType]

        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
          unit.effective_rent = u[:Units][:Unit][:MarketRent]
        end

        unit.square_feet = u[:Units][:Unit][:SquareFeet]

        is_available = false
        vacate_date = ""

        api_unit&.each do |unit_with_key|
          if unit_with_key.key?(:Availability)

            if unit_with_key[:Availability][:VacateDate][0][:Year].present? && unit_with_key[:Availability][:VacateDate][0][:Year].to_i > 0 && unit_with_key[:Availability][:VacateDate][0][:Month].to_i > 0 && unit_with_key[:Availability][:VacateDate][0][:Day].to_i > 0
              vacate_date = Date.parse("#{unit_with_key[:Availability][:VacateDate][0][:Year]}-#{unit_with_key[:Availability][:VacateDate][0][:Month]}-#{unit_with_key[:Availability][:VacateDate][0][:Day]}")
              is_available = unit_with_key[:Availability][:VacancyClass] == "Unoccupied" ? true : false
            end

            if unit_with_key[:Availability][:MadeReadyDate][0][:Year].present? && unit_with_key[:Availability][:MadeReadyDate][0][:Year].to_i > 0 && unit_with_key[:Availability][:MadeReadyDate][0][:Month].to_i > 0 && unit_with_key[:Availability][:MadeReadyDate][0][:Day].to_i > 0
              vacate_date = Date.parse("#{unit_with_key[:Availability][:MadeReadyDate][0][:Year]}-#{unit_with_key[:Availability][:MadeReadyDate][0][:Month]}-#{unit_with_key[:Availability][:MadeReadyDate][0][:Day]}")
              is_available = unit_with_key[:Availability][:VacancyClass] == "Unoccupied" ? true : false
            end
          end

          if unit_with_key.key?(:EffectiveRent)
            unit.min_effective_rent = unit_with_key[:EffectiveRent][0][:Min] if unit_with_key[:EffectiveRent].present? rescue nil
            unit.max_effective_rent = unit_with_key[:EffectiveRent][0][:Max] if unit_with_key[:EffectiveRent].present? rescue nil
          end

          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
            if unit_with_key.key?(:EffectiveRent)
              unit.effective_rent = unit_with_key[:EffectiveRent][0][:Min].to_f > 0 ? unit_with_key[:EffectiveRent][0][:Min] : 1
            end
          end
        end

        pr = api_unit[3]
        rentStr = ""
        unitLeaseTerm = []
        array_of_rents = []

        begin
          if pr.present? && pr[:Pricing].present? && pr[:Pricing][:'MITS-OfferTerm'].present?
            pr[:Pricing][:'MITS-OfferTerm']&.each_with_index do |pricing, index|
              month = pricing[:DateRange][:StartDate][0][:Month]
              day = pricing[:DateRange][:StartDate][0][:Day]
              year = pricing[:DateRange][:StartDate][0][:Year]
              startDate = "#{day}/#{month}/#{year}"
              month = pricing[:DateRange][:EndDate][0][:Month]
              day = pricing[:DateRange][:EndDate][0][:Day]
              year = pricing[:DateRange][:EndDate][0][:Year]
              endDate =  "#{day}/#{month}/#{year}"

              unless unitLeaseTerm.include?(pricing[:Term])
                rentStr = rentStr + (pricing[:Term].to_s) +":"+ pricing[:EffectiveRent].gsub(/[\s,]/ ,"") +"::"+ startDate +":"+ endDate + ";"
                array_of_rents << pricing[:EffectiveRent].to_i
                unitLeaseTerm << pricing[:Term]
              end
            end

            min_term_rent = array_of_rents.min
            max_term_rent = array_of_rents.max
    
            if min_term_rent.present?
              unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                unit.effective_rent = min_term_rent
                unit.market_rent = min_term_rent
              end
            end
    
            unit.min_effective_rent = min_term_rent if min_term_rent.present?
            unit.max_effective_rent = max_term_rent if max_term_rent.present?

          end
        
          unit.lease_pricing = rentStr
        rescue =>  e
          unit.lease_pricing = nil
          raise e
        end

        unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
          unit.availability = is_available ? "Unoccupied" : "Occupied"
          if u[:Units][:Unit][:UnitLeasedStatus] == "on_notice"
            unit.availability = "Unoccupied"
          end
        end
        
        unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
          unit.available_date = vacate_date
        end
        
        unless unit.available_is_updated.present? && unit.available_is_updated  && unit.manual_override
          if unit.availability == "Unoccupied"
            unit.available = true
          else
            unit.available = false
          end
        end

        @unit_record << unit.provider_unit_id

        import_units << unit
      else
        provider_unit_id = "#{u[:Units][:Unit][:Identification][0][:IDValue]}-#{property_id}" rescue "#{u[:Units][:Unit][:Identification][0][0][:IDValue]}-#{property_id}"

        unit = Unit.where(provider: "yardi", community_id: @credentials.community_id, property_id: property_id, provider_unit_id: provider_unit_id).first_or_initialize
        unless unit.manual_override
          unit.property_id = property_id
          unit.unit_type = u[:Units][:Unit][:UnitType]
          
          unless unit.name_is_updated.present? && unit.name_is_updated  && unit.manual_override
            unit.marketing_name = (u[:Units][:Unit][:Identification][0][:IDValue] rescue u[:Units][:Unit][:Identification][0][0][:IDValue])
          end

          unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated && unit.manual_override
            unit.floorplan_id = u[:Units][:Unit][:UnitType]
          end

          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated  && unit.manual_override
            unit.effective_rent = u[:Units][:Unit][:MarketRent]
          end

          unit.square_feet = u[:Units][:Unit][:SquareFeet]
          unit.market_rent = u[:Units][:Unit][:MarketRent]
          
          unless unit.floor_is_updated.present? && unit.floor_is_updated  && unit.manual_override
            unit.floor = evaluate_floor(unit.marketing_name) rescue nil
          end

          # unless unit.building_is_updated.present? && unit.building_is_updated  && unit.manual_override
          #   unit.building = evaluate_building(unit.marketing_name) rescue nil
          # end

          is_available = false
          vacate_date = ""
          array_of_rents = []

          api_unit&.each do |unit_with_key|
            if unit_with_key.key?(:Availability)

              if unit_with_key[:Availability][:VacateDate][0][:Year].present? && unit_with_key[:Availability][:VacateDate][0][:Year].to_i > 0 && unit_with_key[:Availability][:VacateDate][0][:Month].to_i > 0 && unit_with_key[:Availability][:VacateDate][0][:Day].to_i > 0
                vacate_date = Date.parse("#{unit_with_key[:Availability][:VacateDate][0][:Year]}-#{unit_with_key[:Availability][:VacateDate][0][:Month]}-#{unit_with_key[:Availability][:VacateDate][0][:Day]}")
                is_available = unit_with_key[:Availability][:VacancyClass] == "Unoccupied" ? true : false
              end
              
              if unit_with_key[:Availability][:MadeReadyDate][0][:Year].present? && unit_with_key[:Availability][:MadeReadyDate][0][:Year].to_i > 0 && unit_with_key[:Availability][:MadeReadyDate][0][:Month].to_i > 0 && unit_with_key[:Availability][:MadeReadyDate][0][:Day].to_i > 0
                vacate_date = Date.parse("#{unit_with_key[:Availability][:MadeReadyDate][0][:Year]}-#{unit_with_key[:Availability][:MadeReadyDate][0][:Month]}-#{unit_with_key[:Availability][:MadeReadyDate][0][:Day]}")
                is_available = unit_with_key[:Availability][:VacancyClass] == "Unoccupied" ? true : false
              end
            end

            if unit_with_key.key?(:EffectiveRent)
              unit.min_effective_rent = unit_with_key[:EffectiveRent][0][:Min] if unit_with_key[:EffectiveRent].present? rescue nil
              unit.max_effective_rent = unit_with_key[:EffectiveRent][0][:Max] if unit_with_key[:EffectiveRent].present? rescue nil
            end

            unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
              if unit_with_key.key?(:EffectiveRent)
                unit.effective_rent = unit_with_key[:EffectiveRent][0][:Min].to_f > 0 ? unit_with_key[:EffectiveRent][0][:Min] : 1
              end
            end
          end

          pr = api_unit[3]
          rentStr = ""
          unitLeaseTerm = []

          begin
            if pr[:Pricing].present? && pr[:Pricing][:'MITS-OfferTerm'].present?

              pr[:Pricing][:'MITS-OfferTerm']&.each_with_index do |pricing, index|
                month = pricing[:DateRange][:StartDate][0][:Month]
                day = pricing[:DateRange][:StartDate][0][:Day]
                year = pricing[:DateRange][:StartDate][0][:Year]
                startDate = "#{day}/#{month}/#{year}"
                month = pricing[:DateRange][:EndDate][0][:Month]
                day = pricing[:DateRange][:EndDate][0][:Day]
                year = pricing[:DateRange][:EndDate][0][:Year]
                endDate =  "#{day}/#{month}/#{year}"

                unless unitLeaseTerm.include?(pricing[:Term])
                  rentStr = rentStr + (pricing[:Term].to_s) +":"+ pricing[:EffectiveRent].gsub(/[\s,]/ ,"") +"::"+ startDate +":"+ endDate + ";"
                  array_of_rents << pricing[:EffectiveRent].to_i
                  unitLeaseTerm << pricing[:Term]
                end
              end

              min_term_rent = array_of_rents.min
              max_term_rent = array_of_rents.max
    
              if min_term_rent.present?
                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                  unit.effective_rent = min_term_rent
                  unit.market_rent = min_term_rent
                end
              end
      
              unit.min_effective_rent = min_term_rent if min_term_rent.present?
              unit.max_effective_rent = max_term_rent if max_term_rent.present?

            end

            unit.lease_pricing = rentStr
          rescue => e
            raise e
            unit.lease_pricing = nil
          end

          unless unit.availability_is_updated.present? && unit.availability_is_updated  && unit.manual_override
            unit.availability = is_available ? "Unoccupied" : "Occupied"
            if u[:Units][:Unit][:UnitLeasedStatus] == "on_notice"
              unit.availability = "Unoccupied"
            end
          end

          unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
            unit.available_date = vacate_date
          end
          unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
            if unit.availability == "Unoccupied"
              unit.available = true
            else
              unit.available = false
            end
          end

          unit.manually_updated = false
          import_units << unit
        end
      end
    end
    
    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
    ProvidersDataUpdationService.new().update_availability_of_units(@credentials.community_id, (unit_present - @unit_record))
  end

  def save_yardi4_floorplans(floorplans)
    return unless @all_floorplans_hash.present?
    
    import_floorplans = []
    floorplans&.each do |floorplan|
      fp = @all_floorplans_hash[floorplan[0][:IDValue].to_s]

      if fp.present?
        floorplan&.each do |f|
          unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated  && fp.manual_override
            if f.key?(:MarketRent)
              if f[:MarketRent][0][:Min].to_f > 0
                fp.market_rent = f[:MarketRent][0][:Min]
              else
                fp.market_rent = f[:MarketRent][0][:Max]
              end
            end
          end
        end

        import_floorplans << fp

      else
        fp = Floorplan.where(provider: "yardi",community_id: @credentials.community_id,provider_floorplan_id: floorplan[0][:IDValue]).first_or_initialize
        
        unless fp.manual_override
          rooms = []
          floorplan&.each do |f|

            if f.key?(:Room)
              rooms << f
            end

            if f.key?(:Name)
              unless fp.name_is_updated.present? && fp.name_is_updated  && fp.manual_override
                fp.name = f[:Name]
              end

            end

            unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated  && fp.manual_override
              if f.key?(:MarketRent)
                if f[:MarketRent][0][:Min].to_f > 0
                  fp.market_rent = f[:MarketRent][0][:Min]
                else
                  fp.market_rent = f[:MarketRent][0][:Max]
                end
              end
            end

            unless fp.square_feet_is_updated.present? && fp.square_feet_is_updated  && fp.manual_override
              if f.key?(:SquareFeet)
                if f[:SquareFeet][0][:Min].to_f > 0
                  fp.square_feet = f[:SquareFeet][0][:Min]
                else
                  fp.square_feet = f[:SquareFeet][0][:Max]
                end
              end
            end
          end

          rooms&.each do |room|
            if room[:Room][0][:RoomType] == "Bedroom"
              unless fp.bedroom_is_updated.present? && fp.bedroom_is_updated  && fp.manual_override
                fp.bedrooms = room[:Room][1][:Count]
              end
            else
              unless fp.bathroom_is_updated.present? && fp.bathroom_is_updated  && fp.manual_override
                fp.bathrooms = room[:Room][1][:Count]
              end
            end
          end

          import_floorplans << fp
        end
      end
    end

    ProvidersDataUpdationService.new().update_or_create_floorplans_records(import_floorplans)
  end

end