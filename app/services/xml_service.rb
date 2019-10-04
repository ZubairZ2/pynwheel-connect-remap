class XmlService < BaseService
  def perform
    property_ids = credentials.xml_domain.split(',') rescue []
    property_ids.each do |property_id|
      begin

        filename = credentials.xml_filename
        domain = property_id
        url = "http://pynwheel.com/swoop/datafeeds/tgm/"
        url = url  + filename + ".xml"


        response = HTTParty.get(url)
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
    unit_record = []
    unit_present =  Unit.where("community_id = ? AND provider IN (?)", credentials.community_id,  ["xml"]).map{|x| x.provider_unit_id}
    units.each do |u|
      vacateDate = ""
      begin
        unit = Unit.find_by(provider: "xml",community_id: credentials.community_id,provider_unit_id: u["Id"])
        if unit.present?
          # unit.property_id = property_id
          # unit.unit_type = u["Unit"]["Information"]["UnitType"]
          # unit.marketing_name = u["Unit"]["MarketingName"]["__content__"]
          # unit.floorplan_id = u["FloorplanID"]
          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
            unit.effective_rent = 1.0 #Setting rent to avoid validation issues
            if u["EffectiveRent"]["Min"].present?
              unit.effective_rent = u["EffectiveRent"]["Min"]
            elsif u["EffectiveRent"]["Avg"].present?
              unit.effective_rent = u["EffectiveRent"]["Avg"]
            end
          end

          # unit.floor = u["EntryFloor"]
          if u["Availability"].present?
            unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
              unit.availability = u["Availability"]["VacancyClass"] if !unit.sold
            end
            unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
              if u["Availability"]["VacancyClass"] == "Unoccupied"
                unit.available = true if !unit.sold
              else
                unit.available = false
              end
            end

            if u["Availability"]["VacateDate"].present?
              year = u["Availability"]["VacateDate"]["Year"]
              month = u["Availability"]["VacateDate"]["Month"]
              day = u["Availability"]["VacateDate"]["Day"]
              vacateDate = Date.parse("#{year}-#{month}-#{day}")
            end

          end
          # unit.availability_url = u["Availability"]["UnitAvailabilityURL"]
          # unit.square_feet = u["Unit"]["Information"]["MinSquareFeet"]
          unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
            unit.available_date = vacateDate
          end

          # building = u["BuildingID"]
          # unit.building = building.present? ? building.gsub("Building ", "") : ""
          unit.manually_updated = false
          unit_record << unit.provider_unit_id
          unit.save(validate: false)

        end
      rescue => e
      end
    end
    no_unit = unit_present - unit_record
    if unit_record.nil?
      no_unit = nil
    end
    no_unit.each do |un|
      unit = Unit.find_by(community_id: credentials.community_id, provider_unit_id: un)
      unit.availability = "Occupied"
      unit.available = false
      unit.save(validate: false)
    end
  end

  def save_xml_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.find_by(provider: "xml",community_id: credentials.community_id,provider_floorplan_id: f["Id"])
      if floorplan.present?
        # floorplan.property_id = property_id
        # floorplan.name = f["Name"]
        # floorplan.unit_count = f["UnitCount"]
        # floorplan.units_available = f["DisplayedUnitsAvailable"]
        # if f["FloorplanAvailabilityURL"].present?
        #   floorplan.availability_url = f["FloorplanAvailabilityURL"]
        # end

        # floorplan.bedrooms = f["Room"][0]["Count"]
        #
        # floorplan.bathrooms = f["Room"][1]["Count"]


        # if f["SquareFeet"]["Min"].to_f > 0
        #   floorplan.square_feet = f["SquareFeet"]["Min"]
        # else
        #   floorplan.square_feet = f["SquareFeet"]["Max"]
        # end
        unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated && unit.manual_override
          if f["MarketRent"]["Min"].to_f > 0
            floorplan.market_rent = f["MarketRent"]["Min"]
          else
            floorplan.market_rent = f["MarketRent"]["Max"]
          end
        end

        floorplan.save(validate: false)
      end
    end
  end

end