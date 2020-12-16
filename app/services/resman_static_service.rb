class ResmanStaticService < BaseService
  def perform
    property_ids = credentials.resman_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin

        account_id = credentials.resman_account_id
        #property_id = credentials.property_id
        url = "https://api.myresman.com/MITS/GetMarketing2_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey": '9412bd2716b648c1b00b62643e63850b',
                                     "IntegrationPartnerID": '1214',
                                     "AccountID": account_id,
                                     "PropertyID": property_id,
                                 },
                                 :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )
        # response =  JSON.parse(response.body)
        if response["ResMan"]["Status"] == "Success"
          units = []
          floorplans = []
          response["ResMan"]["Response"]["PhysicalProperty"]["Property"]["ILS_Unit"].each do |pro|
            units << pro
          end

          response["ResMan"]["Response"]["PhysicalProperty"]["Property"]["Floorplan"].each do |pro|
            floorplans << pro
          end
          save_resman_units(units,property_id)
          save_resman_floorplans(floorplans,property_id)
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = nil
            cred.save
          rescue => err
          end
          # save_website_column_of_community(response)
        else
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
            cred.save
          rescue => err
          end
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        begin
          cred = Credential.find credentials.id
          cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
          cred.save
        rescue => err
        end
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end
  def save_resman_units(units,property_id)
    units.each do |u|
      vacateDate = ""
      unit = Unit.where(provider: "resman",community_id: credentials.community_id,provider_unit_id: u["Id"].gsub('*','-')).first_or_initialize
      unless unit.manual_override
        unit.property_id = property_id
        unit.unit_type = u["Unit"]["MITS:Information"]["MITS:UnitType"]

        unless unit.name_is_updated.present? && unit.name_is_updated
          unit.marketing_name = u["Id"]
        end
        unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
          unit.floorplan_id = u["Unit"]["MITS:Information"]["MITS:FloorPlanID"]
        end
        unit.min_effective_rent = u["EffectiveRent"]["Min"] if u["EffectiveRent"]["Min"].present?
        unit.max_effective_rent = u["EffectiveRent"]["Max"] if u["EffectiveRent"]["Max"].present?
        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
          unit.effective_rent = 1.0 #Setting rent to avoid validation issues
          if u["EffectiveRent"].present?
          unit.effective_rent = u["EffectiveRent"]["Min"]
          elsif u["Unit"]["MITS:Information"]["MITS:MarketRent"].present?
            unit.effective_rent = u["Unit"]["MITS:Information"]["MITS:MarketRent"]
          end
        end
        unless unit.floor_is_updated.present? && unit.floor_is_updated
          unit.floor = u["FloorLevel"]
        end

        if u["Availability"].present?
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = "Unoccupied"
          end

          year = u["Availability"]["VacateDate"]["Year"]
          month = u["Availability"]["VacateDate"]["Month"]
          day = u["Availability"]["VacateDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        else
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = "Occupied"
          end
        end
        unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
          if unit.availability == "Occupied"
            unit.available = false
          else
            unit.available = true
          end
        end
        unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
          unit.available_date = vacateDate

        end
        unless unit.building_is_updated.present? && unit.building_is_updated
          building = u["Unit"]["MITS:Information"]["MITS:BuildingID"]
          unit.building = building.present? ? building.gsub("Building ", "") : ""
        end

        unit.manually_updated = false
        unit.save(validate: false)
      end
    end
  end

  def save_resman_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "resman",community_id: credentials.community_id,provider_floorplan_id: f["Id"]).first_or_initialize
      floorplan.property_id = property_id
      unless floorplan.name_is_updated.present? && floorplan.name_is_updated
        floorplan.name = f["Name"]
      end

      floorplan.unit_count = f["UnitCount"]
      floorplan.units_available = f["UnitsAvailable"]
      floorplan.deposit = f["Deposit"]["Amount"]["Value"]
      if f["FloorplanAvailabilityURL"].present?
        floorplan.availability_url = f["FloorplanAvailabilityURL"]
      end
      room_types = f["Room"]
      room_types.each do |rt|
        if rt["Type"] == "Bedroom"
          unless floorplan.bedroom_is_updated.present? && floorplan.bedroom_is_updated
            floorplan.bedrooms = rt["Count"]
          end
        else
          unless floorplan.bathroom_is_updated.present? && floorplan.bathroom_is_updated
            floorplan.bathrooms = rt["Count"]
          end

        end
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

end