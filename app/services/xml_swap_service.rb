class XmlSwapService < BaseService
  def perform
    property_ids = credentials.xml_domain.split(',') rescue []
    property_ids.each do |property_id|
      begin

        filename = credentials.xml_filename
        domain = property_id
        url = "http://pynwheel.com/swoop/datafeeds/#{filename.include?(".xml") ? filename : "#{filename}.xml"}"

        response = HTTParty.get(URI.encode(url))
        
        result = ""

        if response['PhysicalProperty']['Property'].class == Array
          response['PhysicalProperty']['Property'].each do |p|
            if p['PropertyID']['Identification']['SecondaryID'].present?
              if p['PropertyID']['Identification']['SecondaryID'] == domain
                result = p
              end
            end
          end
        else
          p = response['PhysicalProperty']['Property']

          if p['PropertyID']['Identification']['SecondaryID'] == domain
            result = p
          end
        end
        if result.present?
          result = result.to_s.gsub("xsi:","")
          result = eval(result)
          units = []
          floorplans = []
          result["ILS_Unit"].each do |pro|
            units << pro
          end

          result["Floorplan"].each do |pro|
            floorplans << pro
          end
          save_xml_units(units,property_id)
          save_xml_floorplans(floorplans,property_id)
          rename_provider
        else
          # puts '-----------------------------' , response["response"]["error"]["message"]
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end
  def save_xml_units(units,property_id)
    units.each do |u|
      vacateDate = ""

      unit = Unit.where(community_id: credentials.community_id,marketing_name: get_marketing_name(u))
      if unit.count > 1
        unit = Unit.where(community_id: credentials.community_id,marketing_name: get_marketing_name(u),building: u["BuildingID"].present? ? u["BuildingID"] : "")
      end
      if unit.present?
        unit = unit.first
        unit.provider = "xml_new"
        unit.property_id = property_id
        unit.provider_unit_id = u["Id"]
        unit.unit_type = u["Unit"]["Information"]["UnitType"]
        unit.floorplan_id = u["FloorplanID"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues
        if u["EffectiveRent"]["Min"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
        elsif u["EffectiveRent"]["Avg"].present?
          unit.effective_rent = u["EffectiveRent"]["Avg"]
        end
        unit.floor = u["EntryFloor"]
        if u["Availability"].present?
          unit.availability = u["Availability"]["VacancyClass"]
          if u["Availability"]["VacancyClass"] == "Unoccupied"
            unit.available = true
          end
          if u["Availability"]["VacateDate"].present?
            year = u["Availability"]["VacateDate"]["Year"]
            month = u["Availability"]["VacateDate"]["Month"]
            day = u["Availability"]["VacateDate"]["Day"]
            vacateDate = Date.parse("#{year}-#{month}-#{day}")
          end

        end
        unit.availability_url = u["Availability"]["UnitAvailabilityURL"]
        unit.square_feet = u["Unit"]["Information"]["MinSquareFeet"]
        unit.available_date = vacateDate
        building = u["BuildingID"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.manually_updated = false
        unit.save(validate: false)
      else
        dup = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["Id"])
        if dup.present?
          dup.destroy
        end

        unit = Unit.new
        unit.community_id = credentials.community_id
        unit.provider = "xml_new"
        unit.provider_unit_id = u["Id"]
        unit.property_id = property_id
        unit.unit_type = u["Unit"]["Information"]["UnitType"]
        unit.marketing_name = get_marketing_name(u)
        unit.floorplan_id = u["FloorplanID"]
        unit.effective_rent = 1.0 #Setting rent to avoid validation issues
        if u["EffectiveRent"]["Min"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
        elsif u["EffectiveRent"]["Avg"].present?
          unit.effective_rent = u["EffectiveRent"]["Avg"]
        end
        unit.floor = u["EntryFloor"]
        if u["Availability"].present?
          unit.availability = u["Availability"]["VacancyClass"]
          if u["Availability"]["VacancyClass"] == "Unoccupied"
            unit.available = true
          end
          if u["Availability"]["VacateDate"].present?
            year = u["Availability"]["VacateDate"]["Year"]
            month = u["Availability"]["VacateDate"]["Month"]
            day = u["Availability"]["VacateDate"]["Day"]
            vacateDate = Date.parse("#{year}-#{month}-#{day}")
          end

        end
        unit.availability_url = u["Availability"]["UnitAvailabilityURL"]
        unit.square_feet = u["Unit"]["Information"]["MinSquareFeet"]
        unit.available_date = vacateDate
        building = u["BuildingID"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.manually_updated = false
        unit.save(validate: false)
      end
    end



  end

  def save_xml_floorplans(floorplans,property_id)
    floorplans.each do |f|

      floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"])
      if floorplan.count > 1
        floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"],bedrooms: f["Room"][0]["Count"],bathrooms: f["Room"][1]["Count"],square_feet: f["SquareFeet"]["Min"])
      end
      if floorplan.present?
        floorplan = floorplan.first
        floorplan.property_id = property_id
        # floorplan.name = f["Name"]
        floorplan.unit_count = f["UnitCount"]
        floorplan.provider = "xml_new"
        floorplan.provider_floorplan_id = f["Id"]
        floorplan.units_available = f["DisplayedUnitsAvailable"]
        if f["FloorplanAvailabilityURL"].present?
          floorplan.availability_url = f["FloorplanAvailabilityURL"]
        end

        floorplan.bedrooms = f["Room"][0]["Count"]

        floorplan.bathrooms = f["Room"][1]["Count"]


        if f["SquareFeet"]["Min"].to_f > 0
          floorplan.square_feet = f["SquareFeet"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["Max"]
        end
        if f["MarketRent"]["Min"].to_f > 0
          floorplan.market_rent = f["MarketRent"]["Min"]
        else
          floorplan.market_rent = f["MarketRent"]["Max"]
        end
        floorplan.save(validate: false)
      else
        dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: f["Id"])
        if dup.present?
          dup.destroy
        end

        floorplan = Floorplan.new
        floorplan.community_id = credentials.community_id
        floorplan.provider = "xml_new"
        floorplan.property_id = property_id
        floorplan.property_id = property_id
        floorplan.name = f["Name"]
        floorplan.provider_floorplan_id = f["Id"]
        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["DisplayedUnitsAvailable"]
        if f["FloorplanAvailabilityURL"].present?
          floorplan.availability_url = f["FloorplanAvailabilityURL"]
        end

        floorplan.bedrooms = f["Room"][0]["Count"]

        floorplan.bathrooms = f["Room"][1]["Count"]


        if f["SquareFeet"]["Min"].to_f > 0
          floorplan.square_feet = f["SquareFeet"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["Max"]
        end
        if f["MarketRent"]["Min"].to_f > 0
          floorplan.market_rent = f["MarketRent"]["Min"]
        else
          floorplan.market_rent = f["MarketRent"]["Max"]
        end
        floorplan.save(validate: false)
        # puts "]]]]]]]]]]", floorplan.errors.full_message.join(',')
        puts '==================================='
      end
    end



  end

  def rename_provider
    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      unless d.provider == "xml_new"
        d.destroy
      end
    end
    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      unless d.provider == "xml_new" || d.provider == "manually"
        d.destroy
      end
    end
    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      if d.provider == "xml_new"
        d.provider = "xml"
        d.save
      end
    end

    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      if d.provider == "xml_new"
        d.provider = "xml"
        d.save
      end
    end

  end

  private
    def get_marketing_name u
      if u["Unit"]["MarketingName"]["__content__"].present?
        u["Unit"]["MarketingName"]["__content__"]
      else
        u["Unit"]["MarketingName"]
      end

    rescue => e
      u["Unit"]["MarketingName"]
    end
end