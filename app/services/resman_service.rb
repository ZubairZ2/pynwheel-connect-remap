class ResmanService < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
    @all_units_hash = ProvidersDataUpdationService.new().get_all_units_hash(@credentials.community_id, "resman")
    @all_floorplans_hash = ProvidersDataUpdationService.new().get_all_floorplans_hash(@credentials.community_id, "resman")
  end

  def perform
    before_updation_units = NotifyManagerService.new(@credentials.community_id)
    property_ids = @credentials.resman_property_id.split(',') rescue []

    property_ids.each do |property_id|
      begin

        account_id = @credentials.resman_account_id
        community = Community.find @credentials.community_id
        url = "#{ENV["RESMAN_BASE_URL"]}/GetMarketing2_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey": ENV["RESMAN_API_KEY"],
                                     "IntegrationPartnerID": ENV["RESMAN_PARTNER_ID"],
                                     "AccountID": account_id,
                                     "PropertyID": property_id,
                                 },
                                 :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )

        if response["ResMan"]["Status"] == "Success"
          units = []
          floorplans = []
          property_data = response.dig("ResMan", "Response", "PhysicalProperty", "Property")

          if property_data.present?
            property_data["ILS_Unit"]&.each do |pro|
              units << pro
            end

            if property_data["Floorplan"].present?
              case property_data["Floorplan"]
              when Hash
                floorplans << property_data["Floorplan"]
              when Array
                property_data["Floorplan"]&.each do |pro|
                  floorplans << pro
                end
              end
            end

            save_resman_units(units, property_id)
            save_resman_floorplans(floorplans, property_id)
            update_additional_fee_and_pricing(community, response)
          end
        end
      rescue => e
        raise e
      end
    end

    before_updation_units.compare_status_and_notify()
  end

  private

  def save_resman_units(units, property_id)
    import_units = []
    unit_record = []
    unit_present =  Unit.where("community_id = ? AND provider IN (?)",  @credentials.community_id,  ["resman"]).map{|x| x.provider_unit_id.gsub('*','-')}
    community = Community.find @credentials.community_id
    community&.community_data_updated_on()
    
    units.each do |u|
      vacateDate = ""
      unit = @all_units_hash[u["Id"].gsub('*','-')]

      if unit.present?
        puts "----------------------------- #{unit.marketing_name} ------------------------\n"
        unit_status_update(unit, u)
        unit.lease_pricing = nil

        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
          unit.effective_rent = 1.0 #Setting rent to avoid validation issues
          if u["Unit"]["MITS:Information"]["MITS:MarketRent"].present?
            unit.effective_rent = u["Unit"]["MITS:Information"]["MITS:MarketRent"]
          elsif u["EffectiveRent"].present? && u["EffectiveRent"]["Avg"].present?
            unit.effective_rent = u["EffectiveRent"]["Avg"]
          end
        end

        if u["Availability"].present?
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = "Unoccupied" if !unit.sold
          end

          year = u["Availability"]["MadeReadyDate"]["Year"]
          month = u["Availability"]["MadeReadyDate"]["Month"]
          day = u["Availability"]["MadeReadyDate"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        else
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = "Occupied"
          end
        end

        unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
          if unit.availability == "Unoccupied"
            unit.available = true if !unit.sold
          else
            unit.available = false
          end
        end

        unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
          unit.available_date = vacateDate
        end

        unit.availability_url = u.dig("Availability", "UnitAvailabilityURL").presence || ""

        unit_record << unit.provider_unit_id.gsub('*','-')
        import_units << unit

      else
        vacateDate = ""
        unit = Unit.where(provider: "resman",community_id: @credentials.community_id,provider_unit_id: u["Id"].gsub('*','-')).first_or_initialize
        unless unit.manual_override
          unit.property_id = property_id
          unit.unit_type = u["Unit"]["MITS:Information"]["MITS:UnitType"]
          unit_status_update(unit, u)
          unit.lease_pricing = nil
          
          unless unit.name_is_updated.present? && unit.name_is_updated
            unit.marketing_name = u["Id"]
          end
          unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
            unit.floorplan_id = u["Unit"]["MITS:Information"]["MITS:FloorPlanID"]
          end

          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
            unit.effective_rent = 1.0 #Setting rent to avoid validation issues
            if u["Unit"]["MITS:Information"]["MITS:MarketRent"].present?
              unit.effective_rent = u["Unit"]["MITS:Information"]["MITS:MarketRent"]
            elsif u["EffectiveRent"].present? && u["EffectiveRent"]["Avg"].present?
              unit.effective_rent = u["EffectiveRent"]["Avg"]
            end
          end

          unless unit.floor_is_updated.present? && unit.floor_is_updated
            unit.floor = u["FloorLevel"]
          end

          if u["Availability"].present?
            unless unit.availability_is_updated.present? && unit.availability_is_updated
              unit.availability = "Unoccupied"
            end

            year = u["Availability"]["MadeReadyDate"]["Year"]
            month = u["Availability"]["MadeReadyDate"]["Month"]
            day = u["Availability"]["MadeReadyDate"]["Day"]
            vacateDate = Date.parse("#{year}-#{month}-#{day}")
          else
            unless unit.availability_is_updated.present? && unit.availability_is_updated
              unit.availability = "Occupied"
            end
          end
          unless unit.available_is_updated.present? && unit.available_is_updated
            if unit.availability == "Occupied"
              unit.available = false
            else
              unit.available = true
            end
          end
          unless unit.available_date_is_updated.present? && unit.available_date_is_updated
            unit.available_date = vacateDate

          end
          unless unit.building_is_updated.present? && unit.building_is_updated
            building = u["Unit"]["MITS:Information"]["MITS:BuildingID"]
            unit.building = building.present? ? building.gsub("Building ", "") : ""
          end

          unit.availability_url = u.dig("Availability", "UnitAvailabilityURL").presence || ""

          unit.manually_updated = false
          import_units << unit
        end
      end
    end

    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
    ProvidersDataUpdationService.new().update_availability_of_units(@credentials.community_id, (unit_present - unit_record))

  end

  def save_resman_floorplans(floorplans,property_id)
    import_floorplans = []

    floorplans.each do |f|
      floorplan = @all_floorplans_hash[f["Id"]]
      # floorplan = Floorplan.find_by(provider: "resman",community_id: @credentials.community_id,provider_floorplan_id: f["Id"])#.first_or_initialize
      if floorplan.present?
        puts "----------------------------- #{floorplan.name} ------------------------\n"

        unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated && floorplan.manual_override
          if f["MarketRent"]["Min"].to_f > 0
            floorplan.market_rent = f["MarketRent"]["Min"]
          else
            floorplan.market_rent = f["MarketRent"]["Max"]
          end
        end

        # floorplan.save(validate: false)
        import_floorplans << floorplan

      else
        floorplan = Floorplan.where(provider: "resman",community_id: @credentials.community_id,provider_floorplan_id: f["Id"]).first_or_initialize
        floorplan.property_id = property_id
        unless floorplan.name_is_updated.present? && floorplan.name_is_updated
          floorplan.name = f["Name"]
        end

        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["Value"] rescue 0.0
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

        # floorplan.save(validate: false)
        import_floorplans << floorplan

      end
    end

    ProvidersDataUpdationService.new().update_or_create_floorplans_records(import_floorplans)

  end

  def unit_status_update(unit, u)
    vacancy_class = u.dig("Availability", "VacancyClass") || u.dig("Unit", "MITS:Information", "MITS:UnitOccupancyStatus")
  
    unit.unit_status = if %w[unoccupied vacant].include?(vacancy_class.downcase)
                         "Unoccupied"
                       else
                         "Occupied"
                       end
  end  

  def update_additional_fee_and_pricing(community, response)
    if community.display_additional_fee && !community.display_manual_additional_fee
      property = fetch_property_data(response)
      categorized_list = generate_categorized_fee_list(property)
      update_community_with_fees(community, categorized_list)
    end
  end

  def fetch_property_data(response)
    response.dig("ResMan", "Response", "PhysicalProperty", "Property")
  end

  def generate_categorized_fee_list(property)
    fee = property.dig("Fee")

    [
      format_category("Standard Fees", format_fee_list(fee))
    ].compact.join
  end

  def update_community_with_fees(community, categorized_list)
    return if categorized_list.blank?
  
    community.update(additional_fee: "<div>#{categorized_list}</div>")
  end
  
  def format_category(title, items)
    return nil if items.blank?
  
    <<~HTML
      <strong>#{title}</strong>
      <ul>
        #{items}
      </ul>
    HTML
  end
  
  def format_fee_list(fees)
    return "" unless fees

    fees.filter_map do |key, value|
        next if !( value.is_a?(String) || value.is_a?(Integer) )
        value = value.to_i
        next if value.zero?
    
        "<li>#{key.gsub(/([a-z])([A-Z])/, '\1 \2')}: $#{value}</li>"
    end.join
  end
  
end
