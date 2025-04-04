class Resman4Service < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
    @all_units_hash = ProvidersDataUpdationService.new().get_all_units_hash(@credentials.community_id, "resman")
    @all_floorplans_hash = ProvidersDataUpdationService.new().get_all_floorplans_hash(@credentials.community_id, "resman")
  end

  def perform
    before_updation_units = NotifyManagerService.new(@credentials.community_id)
    community = Community.find @credentials.community_id
    property_ids = @credentials.resman_property_id.split(',') rescue []

    property_ids.each do |property_id|
      begin

        account_id = @credentials.resman_account_id
        community = Community.find @credentials.community_id

        url = "#{ENV["RESMAN_BASE_URL"]}/GetMarketing4_0"
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

            $units_availability_url = property_data.dig("Information", "UnitApplicationBaseURL")

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
      unit = @all_units_hash[u["IDValue"].gsub('*','-')]

      if unit.present?
        puts "----------------------------- #{unit.marketing_name} ------------------------\n"

        if u["EffectiveRent"].present? 
          unit.min_effective_rent = u["EffectiveRent"]["Min"] if u["EffectiveRent"]["Min"].present?
          unit.max_effective_rent = u["EffectiveRent"]["Max"] if u["EffectiveRent"]["Max"].present?
        end
       
        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
          if u["EffectiveRent"].present? && u["EffectiveRent"]["Min"].present?
            unit.effective_rent = u["EffectiveRent"]["Min"]
          elsif u["Units"]["Unit"]["MarketRent"].present?
            unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
          end
        end

        unit_status_update(unit, u)
        unit.lease_pricing = get_unit_lease_prising(u)

        if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
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

        if $units_availability_url.present?
          unit.availability_url = $units_availability_url + "&unitNumber=#{u["IDValue"]}"
        end

        unit_record << unit.provider_unit_id.gsub('*','-')
        # unit.save(validate: false)
        import_units << unit

      else
        vacateDate = ""
        unit = Unit.where(provider: "resman",community_id: @credentials.community_id,provider_unit_id: u["IDValue"].gsub('*','-')).first_or_initialize

        unless unit.manual_override
          unit.property_id = property_id
          unit.unit_type = u["Units"]["Unit"]["UnitType"]
          unit_status_update(unit, u)
          unit.lease_pricing = get_unit_lease_prising(u)

          unless unit.name_is_updated.present? && unit.name_is_updated
            unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
          end
          unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
            unit.floorplan_id = u["Units"]["Unit"]["UnitType"]
          end
          
          if u["EffectiveRent"].present?
            unit.min_effective_rent = u["EffectiveRent"]["Min"] if u["EffectiveRent"]["Min"].present?
            unit.max_effective_rent = u["EffectiveRent"]["Max"] if u["EffectiveRent"]["Max"].present?
          end

          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
            unit.effective_rent = 1.0 #Setting rent to avoid validation issues
            if u["EffectiveRent"].present? && u["EffectiveRent"]["Min"].present?
              unit.effective_rent = u["EffectiveRent"]["Min"]
            elsif u["Units"]["Unit"]["MarketRent"].present?
              unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
            end
          end

          unless unit.floor_is_updated.present? && unit.floor_is_updated
            unit.floor = u["FloorLevel"]
          end

          if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
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
            building = u["Units"]["Unit"]["BuildingName"]
            unit.building = building.present? ? building.gsub("Building ", "") : ""
          end
          if $units_availability_url.present?
            unit.availability_url = $units_availability_url + "&unitNumber=#{u["IDValue"]}"
          end

          unit.manually_updated = false
          # unit.save(validate: false)
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
      floorplan = @all_floorplans_hash[f["IDValue"]]

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
        floorplan = Floorplan.where(provider: "resman",community_id: @credentials.community_id,provider_floorplan_id: f["IDValue"]).first_or_initialize
        floorplan.property_id = property_id
        unless floorplan.name_is_updated.present? && floorplan.name_is_updated
          floorplan.name = f["Name"]
        end

        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["Exact"] rescue 0.0
        
        if f["FloorplanAvailabilityURL"].present?
          floorplan.availability_url = f["FloorplanAvailabilityURL"]
        end
        room_types = f["Room"]
        room_types.each do |rt|
          if rt["RoomType"] == "Bedroom"
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

  def get_unit_lease_prising unit, leasing = ""
    if (unit && unit["Pricing"]).present?
      if unit["Pricing"]["MITS_OfferTerm"].kind_of?(Array)
        unit["Pricing"]["MITS_OfferTerm"].each do |pr|
          rent = pr["EffectiveRent"]
          term = pr["Term"]

          leasing = leasing + term.to_s + ":" + rent.to_s + ";"
        end

      elsif unit["Pricing"]["MITS_OfferTerm"].kind_of?(Object)
        rent = unit["Pricing"]["MITS_OfferTerm"]["EffectiveRent"]
        term = unit["Pricing"]["MITS_OfferTerm"]["Term"]

        leasing = leasing + term.to_s + ":" + rent.to_s + ";"
      end
    end

    leasing
  end

  def unit_status_update unit, u
    vacancy_class = u["Availability"]["VacancyClass"]
    unit_occupancy_status =  u["Units"]["Unit"]["UnitOccupancyStatus"]

    if (vacancy_class == "Unoccupied") && (unit_occupancy_status == "vacant")
      unit.unit_status = "Unoccupied"
    else
      unit.unit_status = "Occupied"
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
    pet_fees = property.dig("Policy", "Pet")
    parking_fees = property.dig("Information", "Parking")

    [
      format_category("Standard Fees", format_fee_list(fee)),
      format_category("Pet Fees", format_pet_fee_list(pet_fees)),
      format_category("Parking Fees", format_parking_fee_list(parking_fees))
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
      value = value.to_i
      next if value.zero?
  
      "<li>#{key.gsub(/([a-z])([A-Z])/, '\1 \2')}: $#{value}</li>"
    end.join
  end
  
  def format_pet_fee_list(pet_fees)
    return "" unless pet_fees

    pet_fees = [pet_fees] if pet_fees.is_a?(Hash)

    pet_fees.filter_map do |pet_fee|
      pet_type = pet_fee.dig("Pets", "PetType")
      [
        format_fee_item(pet_fee["Fee"], "Pet Fee", pet_type),
        format_fee_item(pet_fee["Rent"], "Pet Rent", pet_type)
      ]
    end.flatten.join
  end

  def format_parking_fee_list(parking_fees)
    return "" unless parking_fees

    parking_fees = [parking_fees] if parking_fees.is_a?(Hash)

    parking_fees.filter_map do |parking_fee|
      space_fee = parking_fee["SpaceFee"].to_i
      next if space_fee.zero?
  
      comment = parking_fee["Comment"]
  
      "<li>#{comment}: $#{space_fee}</li>"
    end.join
  end
  
  def format_fee_item(amount, label, type = nil)
    if amount.is_a?(String) || amount.is_a?(Integer)
      amount = amount.to_i
      return nil if amount.zero?
    
      "<li>#{label}#{type ? " (#{type})" : ''}: $#{amount}</li>"
    end
  end
  

end