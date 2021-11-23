class Yardi2Service < BaseService
  def perform
    @unit_record = []
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        property_id = property_id.strip
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
          save_yardi2_units(ils_units,external_property_id)
          save_yardi2_floorplans(floorplans)
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = nil
            PaperTrail.enabled = false
            cred.save
            PaperTrail.enabled = true
          rescue => err
          end
          #else
          #puts '------------------------------------' , result["Envelope"]["Body"]["UnitAvailability_LoginResponse"]["UnitAvailability_LoginResult"]["Messages"]["Message"] 
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: "Invalid credentials.Please enter correct one and try again.",community_id: credentials.community_id})
        else
          cred1 = Credential.find credentials.id
          cred1.data_error_exp = "data_not present"
          PaperTrail.enabled = false
          cred1.save
          PaperTrail.enabled = true
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
            PaperTrail.enabled = false
            cred.save
            PaperTrail.enabled = true
          rescue => err
          end
        end
      rescue => e
        cred1 = Credential.find credentials.id
        cred1.data_error_exp = e
        PaperTrail.enabled = false
        cred1.save
        PaperTrail.enabled = true
        begin
          cred = Credential.find credentials.id
          cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
          PaperTrail.enabled = false
          cred.save
          PaperTrail.enabled = true
        rescue => err
        end
        #puts '----------------------------------', e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})  
      end
    end
  end

  def save_yardi2_units(ils_units,property_id)

    unit_present =  Unit.where("community_id = ? AND provider IN (?)", credentials.community_id,  ["yardi"]).map{|x| x.provider_unit_id}
    ils_units[0].lazy.each do |unit_entries|
      begin
        unit = Unit.find_by(provider: "yardi",community_id: credentials.community_id,provider_unit_id: unit_entries[0][:Id])#.first_or_initialize
        if unit.present?
          # unit.property_id = property_id
          # unit.unit_type = unit_entries[0][:Id]
          # unit.marketing_name = unit_entries[0][:Id]
          # unit.floor = evaluate_floor(unit.marketing_name) rescue nil  ################
          is_available = false
          vacate_date = ""
          unit_entries.each do |u|
            # if u.key?(:Unit)
            #   unit.floorplan_id = u[:Unit][:"MITS:Information"][:"MITS:UnitType"]
            # end
            if u.key?(:EffectiveRent)

              unit.min_effective_rent = u[:EffectiveRent][0][:Min] if u[:EffectiveRent][0][:Min].present?
              unit.max_effective_rent = u[:EffectiveRent][0][:Max] if u[:EffectiveRent][0][:Max].present?
              unit.market_rent = u[:EffectiveRent][0][:Min]
              unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                unit.effective_rent = u[:EffectiveRent][0][:Min]
              end

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
          unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override

            unit.available_date = vacate_date
          end
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = is_available ? "Unoccupied" : "Occupied" if !unit.sold
            begin
              if unit_entries[1][:Unit][:"MITS:Information"][:"MITS:UnitLeasedStatus"] == "on notice"
                unit.availability = "Unoccupied"
              end
            rescue =>ex
            end
          end
          unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
            if unit.availability == "Occupied"
              unit.available = false
            else
              unit.available = true if !unit.sold
            end
          end
          @unit_record << unit.provider_unit_id
          unit.save!(validate: false)
        else
          unit = Unit.where(provider: "yardi",community_id: credentials.community_id,provider_unit_id: unit_entries[0][:Id]).first_or_initialize
          unless unit.manual_override
            unit.property_id = property_id
            unit.unit_type = unit_entries[0][:Id]
            unless unit.name_is_updated.present? && unit.name_is_updated
              unit.marketing_name = unit_entries[0][:Id]
            end
            unless unit.floor_is_updated.present? && unit.floor_is_updated
              unit.floor = evaluate_floor(unit.marketing_name) rescue nil  ################
            end

            is_available = false
            vacate_date = ""
            unit_entries.each do |u|
              if u.key?(:Unit)
                unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
                  unit.floorplan_id = u[:Unit][:"MITS:Information"][:"MITS:UnitType"]
                end

              end
              if u.key?(:EffectiveRent)
                unit.market_rent = u[:EffectiveRent][0][:Min]
                unit.min_effective_rent = u[:EffectiveRent][0][:Min] if u[:EffectiveRent][0][:Min].present?
                unit.max_effective_rent = u[:EffectiveRent][0][:Max] if u[:EffectiveRent][0][:Max].present?
                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
                  unit.effective_rent = u[:EffectiveRent][0][:Min]
                end

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
            unless unit.availability_is_updated.present? && unit.availability_is_updated
              unit.availability = is_available ? "Unoccupied" : "Occupied"
              begin
                if unit_entries[1][:Unit][:"MITS:Information"][:"MITS:UnitLeasedStatus"] == "on notice"
                  unit.availability = "Unoccupied"
                end
              rescue =>ex
              end
            end
            unless unit.available_date_is_updated.present? && unit.available_date_is_updated
              unit.available_date = vacate_date
            end
            unless unit.available_is_updated.present? && unit.available_is_updated
              if unit.availability == "Occupied"
                unit.available = false
              else
                unit.available = true
              end
            end

            unit.manually_updated = false
            unit.save(validate: false)
          end
        end
      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})  
      end
    end
    no_unit = unit_present - @unit_record
    if @unit_record.nil?
      no_unit = nil
    end
    no_unit.each do |un|
      unit = Unit.find_by(community_id: credentials.community_id, provider_unit_id: un)
      unit.availability = "Occupied"
      unit.available = false
      unit.available_date = nil
      unit.save(validate: false) unless unit.manual_override
    end
  end

  def save_yardi2_floorplans(floorplans)
    floorplans[0].lazy.each do |floorplan|
      begin
        fp = Floorplan.find_by(provider: "yardi",community_id: credentials.community_id,provider_floorplan_id: floorplan[0][:Id])#.first_or_initialize
        if fp.present?
          rooms = []
          floorplan.each do |f|

            # if f.key?(:Room)
            #   rooms << f
            # end

            # if f.key?(:Name)
            #   fp.name = f[:Name]
            # end
            unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated  && fp.manual_override
              if f.key?(:MarketRent)
                if f[:MarketRent][0][:Min].to_f > 0
                  fp.market_rent = f[:MarketRent][0][:Min]
                else
                  fp.market_rent = f[:MarketRent][0][:Max]
                end
              end
            end


            # if f.key?(:SquareFeet)
            #   if f[:SquareFeet][0][:Min].to_f > 0
            #     fp.square_feet = f[:SquareFeet][0][:Min]
            #   else
            #     fp.square_feet = f[:SquareFeet][0][:Max]
            #   end
            # end

          end

          # rooms.each do |room|
          #   if room[:Room][0][:Type] == "Bedroom"
          #     fp.bedrooms = room[:Room][1][:Count]
          #   else
          #     fp.bathrooms = room[:Room][1][:Count]
          #   end
          # end

          fp.save(validate: false)

        else
          fp = Floorplan.where(provider: "yardi",community_id: credentials.community_id,provider_floorplan_id: floorplan[0][:Id]).first_or_initialize
          unless fp.manual_override

            rooms = []
            floorplan.each do |f|

              if f.key?(:Room)
                rooms << f
              end

              if f.key?(:Name)
                unless fp.name_is_updated.present? && fp.name_is_updated
                  fp.name = f[:Name]
                end

              end
              unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated
                if f.key?(:MarketRent)
                  if f[:MarketRent][0][:Min].to_f > 0
                    fp.market_rent = f[:MarketRent][0][:Min]
                  else
                    fp.market_rent = f[:MarketRent][0][:Max]
                  end
                end
              end

              unless fp.square_feet_is_updated.present? && fp.square_feet_is_updated
                if f.key?(:SquareFeet)
                  if f[:SquareFeet][0][:Min].to_f > 0
                    fp.square_feet = f[:SquareFeet][0][:Min]
                  else
                    fp.square_feet = f[:SquareFeet][0][:Max]
                  end
                end
              end


            end

            rooms.each do |room|
              if room[:Room][0][:Type] == "Bedroom"
                unless fp.bedroom_is_updated.present? && fp.bedroom_is_updated
                  fp.bedrooms = room[:Room][1][:Count]
                end

              else
                unless fp.bathroom_is_updated.present? && fp.bathroom_is_updated
                  fp.bathrooms = room[:Room][1][:Count]
                end

              end
            end

            fp.save(validate: false)
          end
        end
      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})  
      end
    end
  end

end