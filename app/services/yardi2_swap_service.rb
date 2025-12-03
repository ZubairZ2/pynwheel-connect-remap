class Yardi2SwapService < BaseService
  def perform
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
        property_id = property_id&.strip
        interface_entity = credentials.interface_entity
        license_key = YARDI_LICENSE_KEY
        response = HTTParty.post(
            url,
            :headers => {'POST'=>post,'HOST'=>host,'Content-Type'=>'text/xml; charset=utf-8','SOAPAction'=>soap_action},
            :body => '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><UnitAvailability_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard20"><UserName>'+user_name+'</UserName><Password>'+password+'</Password><ServerName>'+server_name+'</ServerName><Database>'+database+'</Database><Platform>'+platform+'</Platform><YardiPropertyId>'+property_id+'</YardiPropertyId><InterfaceEntity>'+interface_entity+'</InterfaceEntity><InterfaceLicense>'+license_key+'</InterfaceLicense></UnitAvailability_Login></soap:Body></soap:Envelope>')
        #result = Hash.from_xml(response.body) This method consumes a lot of memory on heroku
        result = Ox.load(response.body, mode: :hash)
        if result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult].present?
          property_response = result[:"soap:Envelope"][1][:"soap:Body"][:UnitAvailability_LoginResponse][1][:UnitAvailability_LoginResult][:PhysicalProperty][1][:Property]
          property_response.each do |pr|
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
          save_yardi2_floorplans(floorplans)
          save_yardi2_units(ils_units,external_property_id)
        end
      rescue => e
        e.message
      end
    end
    
    rename_provider
  end

  def save_yardi2_units(ils_units, property_id)
    ils_units[0].lazy.each do |unit_entries|
      begin

        unit = Unit.where(community_id: credentials.community_id, marketing_name: unit_entries[0][:Id], floorplan_id: Floorplan.find_by(name: unit_entries[1][:Unit][:"MITS:Information"][:"MITS:FloorplanName"]).provider_floorplan_id) unless unit.present?
        unit = Unit.where(community_id: credentials.community_id, marketing_name: unit_entries[0][:Id], unit_type: unit_entries[1][:Unit][:"MITS:Information"][:"MITS:UnitType"]) unless unit.present?

        if unit.present?
          unit = unit.first
          unit.provider = "yardi_new"
          unit.provider_unit_id = "#{unit_entries[0][:Id]}-#{property_id}"
          unit.property_id = property_id
          unit.unit_type = unit_entries[1][:Unit][:"MITS:Information"][:"MITS:UnitType"]
          unit.floor = evaluate_floor(unit.marketing_name) rescue nil
          unit.building = evaluate_building(unit.marketing_name) rescue nil

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

              unit.square_feet = get_unit_sqft(unit_entries)

              begin
                if unit_entries[1][:Unit][:"MITS:Information"][:"MITS:UnitLeasedStatus"] == "on notice"
                  unit.availability = "Unoccupied"
                end
              rescue =>ex
              end
            end
          end

          unit.availability = is_available ? "Unoccupied" : "Occupied"
          unit.available = is_available ? true : false
          unit.available_date = vacate_date
          unit.save(validate: false)

        else
          provider_unit_id = "#{unit_entries[0][:Id]}-#{property_id}"

          dup = Unit.find_by(community_id: credentials.community_id, property_id: property_id, provider_unit_id: provider_unit_id)

          if dup.present?
            dup.destroy
          end

          unit = Unit.new
          unit.community_id = credentials.community_id
          unit.provider = "yardi_new"
          unit.provider_unit_id = provider_unit_id
          unit.property_id = property_id
          unit.unit_type = unit_entries[1][:Unit][:"MITS:Information"][:"MITS:UnitType"]
          unit.marketing_name = unit_entries[0][:Id]
          unit.floor = evaluate_floor(unit.marketing_name) rescue nil
          unit.building = evaluate_building(unit.marketing_name) rescue nil

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

              unit.square_feet = get_unit_sqft(unit_entries)

              begin
                if unit_entries[1][:Unit][:"MITS:Information"][:"MITS:UnitLeasedStatus"] == "on notice"
                  unit.availability = "Unoccupied"
                end
              rescue =>ex
              end
            end
          end

          unit.availability = is_available ? "Unoccupied" : "Occupied"
          unit.available_date = vacate_date
          unit.available = is_available ? true : false
          unit.save(validate: false)
        end

      rescue => e
      end
    end


  end

  def save_yardi2_floorplans(floorplans)
    floorplans[0].lazy.each do |floorplan|
      begin

        if floorplan[1][:Name].present?

          fp = Floorplan.where(community_id: credentials.community_id,name: floorplan[1][:Name])
          
          if fp.count > 1
            fp = Floorplan.where(community_id: credentials.community_id,name: floorplan[1][:Name],bedrooms: floorplan[3][:Room][1][:Count],bathrooms: floorplan[4][:Room][1][:Count],square_feet: floorplan[5][:SquareFeet][0][:Min])
          end

          if fp.present?
            fp = fp.first
            rooms = []
            floorplan.each do |f|
              fp.provider = "yardi_new"
              if f.key?(:Room)
                rooms << f
              end

              if f.key?(:Id)
                fp.provider_floorplan_id= f[:Id]
                fp.provider = "yardi_new"
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
          else
            fp = Floorplan.new
            rooms = []
            floorplan.each do |f|

              fp.community_id = credentials.community_id


              if f.key?(:Room)
                rooms << f
              end
              if f.key?(:Id)
                dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: floorplan[0][:Id])
                if dup.present?
                  dup.destroy
                end
                fp.provider_floorplan_id = f[:Id]
                fp.provider = "yardi_new"
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
        end

      rescue => e
      end
    end
  end

  def rename_provider
    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      unless d.provider == "yardi_new"
        d.destroy
      end
    end

    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      unless d.provider == "yardi_new" || d.provider == "manually"
        d.destroy
      end
    end

    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      if d.provider == "yardi_new"
        d.provider = "yardi"
        d.save(validate: false)
      end
    end

    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      if d.provider == "yardi_new"
        d.provider = "yardi"
        d.save(validate: false)
      end
    end
    
  end

  private

    def get_unit_sqft(unit_entries)
      min_sqft = unit_entries.dig(1, :Unit, :"MITS:Information", :"MITS:MinSquareFeet").to_f
      max_sqft = unit_entries.dig(1, :Unit, :"MITS:Information", :"MITS:MaxSquareFeet").to_f
      [min_sqft, max_sqft].find { |sqft| sqft && sqft > 1 }
    end

end