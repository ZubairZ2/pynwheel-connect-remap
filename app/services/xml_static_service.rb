class XmlStaticService < BaseService
  def perform
    property_ids = credentials.xml_domain.split(',') rescue []
    property_ids.each do |property_id|
      begin

        filename = credentials.xml_filename
        domain = property_id
        url = "http://pynwheel.com/swoop/datafeeds/#{filename.include?(".xml") ? filename : "#{filename}.xml"}"

        response = HTTParty.get(URI::DEFAULT_PARSER.escape(url))

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
          save_xml_floorplans(floorplans,property_id)
          save_xml_units(units,property_id)
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
  def save_xml_units(units, property_id)
    units.each do |u|
      vacateDate = ""
      unit = Unit.where(provider: "xml",community_id: credentials.community_id,provider_unit_id: u["Id"]).first_or_initialize
      unless unit.manual_override
        unit.property_id = property_id
        unit.unit_type = u["Unit"]["Information"]["UnitType"]
        unless unit.name_is_updated.present? && unit.name_is_updated
          unit.marketing_name = get_marketing_name(u)
        end
        unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
          unit.floorplan_id = u["FloorplanID"]
        end

        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
          unit.effective_rent = 1.0 #Setting rent to avoid validation issues
          if u["EffectiveRent"]["Min"].present?
            unit.effective_rent = u["EffectiveRent"]["Min"]
          elsif u["EffectiveRent"]["Avg"].present?
            unit.effective_rent = u["EffectiveRent"]["Avg"]
          end
        end
        unit.min_effective_rent = u["EffectiveRent"]["Min"]
        unit.max_effective_rent = u["EffectiveRent"]["Max"]
        unless unit.floor_is_updated.present? && unit.floor_is_updated
          unit.floor = u["EntryFloor"]
        end

        if u["Availability"].present?
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = u["Availability"]["VacancyClass"]
          end

          if u["Availability"]["VacancyClass"] == "Unoccupied"
            unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
              unit.available = true
            end

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
        unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
          unit.available_date = vacateDate
        end

        building = u["BuildingID"]
        unless unit.building_is_updated.present? && unit.building_is_updated
          unit.building = building.present? ? building.gsub("Building ", "") : ""
        end

        unit.manually_updated = false
        unit.save(validate: false)
      end
    end
  end

  def save_xml_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "xml",community_id: credentials.community_id,provider_floorplan_id: f["Id"]).first_or_initialize
      floorplan.property_id = property_id
      unless floorplan.name_is_updated.present? && floorplan.name_is_updated
        floorplan.name = f["Name"]
      end

      floorplan.unit_count = f["UnitCount"]
      floorplan.units_available = f["DisplayedUnitsAvailable"]
      if f["FloorplanAvailabilityURL"].present?
        floorplan.availability_url = f["FloorplanAvailabilityURL"]
      end
      unless floorplan.bedroom_is_updated.present? && floorplan.bedroom_is_updated
        floorplan.bedrooms = f["Room"][0]["Count"]
      end

      unless floorplan.bathroom_is_updated.present? && floorplan.bathroom_is_updated
        floorplan.bathrooms = f["Room"][1]["Count"]
      end
      unless floorplan.square_feet_is_updated.present? && floorplan.square_feet_is_updated
        if f["SquareFeet"]["Min"].to_f > 0
          floorplan.square_feet = f["SquareFeet"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["Max"]
        end
      end

      unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated
        if f["MarketRent"]["Min"].to_f > 0
          floorplan.market_rent = f["MarketRent"]["Min"]
        else
          floorplan.market_rent = f["MarketRent"]["Max"]
        end
      end

      floorplan.save(validate: false)

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