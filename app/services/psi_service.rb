class PsiService < BaseService
  @@floorplanHash = Hash.new
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
    @unit_record = []
    @all_units_hash = ProvidersDataUpdationService.new().get_all_units_hash(@credentials.community_id, "psi")
    @all_floorplans_hash = ProvidersDataUpdationService.new().get_all_floorplans_hash(@credentials.community_id, "psi")
  end

  def perform
    begin
      before_updation_units = NotifyManagerService.new(@credentials.community_id)
      property_ids = @credentials.property_id.split(',') rescue []

      property_ids.each do |property_id|

        if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
          url = @credentials.entrata_url
        else
          url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        end

        password = @credentials.password
        username = @credentials.username

        response = HTTParty.post(url,
                                :body => {
                                    "auth": {
                                        "type": "basic",
                                        "password": password,
                                        "username": username
                                    },
                                    "method": {
                                        "name": "getMitsPropertyUnits",
                                        "params": {
                                            "propertyIds": property_id,
                                            "availableUnitsOnly": @credentials&.entrata_available_units_only,
                                            "showUnitSpaces": @credentials&.entrata_show_unit_spaces
                                        }
                                    }
                                }.to_json,
                                :headers => { 'Content-Type' => 'application/json' } )
        response =  JSON.parse(response.body)
        
        if response["response"]["code"] == 200
          units = []
          floorplans = []
          response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
            if pro["ILS_Unit"].present? 
              pro["ILS_Unit"].each do |ils|
                units << ils
              end
            end
          
            if  pro["Floorplan"].present?
              pro["Floorplan"].each do |f|
                floorplans << f
              end
            end
          end

          community = Community.find @credentials.community_id

          save_psi_floorplans(floorplans, property_id)
          save_psi_units(units, property_id)
          update_additional_fee_and_pricing(community, response)
          community&.community_data_updated_on()
        end
      end

      fill_psi_pricing_details()
      before_updation_units.compare_status_and_notify()
    rescue => e
      raise e
    end
  end

  private

  def save_psi_units(units,property_id)
    return unless @all_units_hash.present?

    import_units = []
    unit_present = @all_units_hash.keys
    begin
      units.each do |u|
        vacateDate = ""
        unit = get_psi_matched_unit(u)
        if unit.present?
          puts "----------------------------- #{unit.marketing_name} ------------------------\n"
          unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
          unit.provider = "psi"
          unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
          unit.available_date = vacateDate
          unit_status_update(unit, u)

          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
            if u["EffectiveRent"].present?
              unit.market_rent = u["EffectiveRent"]
              unit.effective_rent = u["EffectiveRent"]

            elsif u["Units"]["Unit"]["MarketRent"].present?
              unit.market_rent = u["Units"]["Unit"]["MarketRent"]
              unit.effective_rent = u["Units"]["Unit"]["MarketRent"]

            elsif u["Units"]["Unit"]["UnitRent"].present?
              unit.market_rent = u["Units"]["Unit"]["UnitRent"]
              unit.effective_rent = u["Units"]["Unit"]["UnitRent"]

            else
              unit.market_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
              unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
            end
          end

          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.availability = u["Availability"]["VacancyClass"] if !unit.sold
            unit.available = false if !unit.sold
          end

          if u["Availability"]["VacancyClass"] == "Unoccupied"
            unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
              unit.available = true if !unit.sold
            end

            if u["Availability"].present? && u["Availability"]["VacateDate"].present? 
              availability_attr = u["Availability"]["VacateDate"]["@attributes"]
              vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
            end

            if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
              availability_attr = u["Availability"]["MadeReadyDate"]["@attributes"]
              vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
            end

          end
          
          unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
            unit.available_date = vacateDate
          end

          # unit.availability_url = u['Availability']['UnitAvailabilityURL'] if u['Availability'].present?
          # unit_floorplan = @all_floorplans_hash[unit.floorplan_id]
          # unit.availability_url = unit_floorplan&.availability_url unless unit.availability_url
          # url_split =  u['Availability']['UnitAvailabilityURL'].split('/') if u['Availability'].present? &&  u['Availability']['UnitAvailabilityURL'].present?
        
          # unit.availability_url_deep_linking = url_split[0]+"//"+url_split[2]+"/Apartments/module/application_authentication/http_referer/"+url_split[2]+"/popup/false/kill_session/1/property[id]/ "+property_id.to_s+"/property_floorplan[id]/"+u["Units"]["Unit"]["@attributes"]["FloorPlanId"].to_s+"/unit_space[id]/"+u["Identification"]["IDValue"].to_s+"/show_in_popup/false/from_check_availability/1/" if url_split.present? rescue ""
          set_availability_url(unit, u)
          @unit_record << unit.provider_unit_id
          import_units << unit      
        else
          unit = Unit.new
          unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
          unit.property_id = property_id
          unit.provider = "psi"
          unit.community_id = @credentials.community_id
          unit.unit_type = u["Units"]["Unit"]["UnitType"]
          unit_status_update(unit, u)
          unit.available_date = vacateDate

          unless unit.name_is_updated.present? && unit.name_is_updated
            unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
          end

          if u["Units"]["Unit"]["MinSquareFeet"].present?
            if u["Units"]["Unit"]["MinSquareFeet"].to_f > 1
              unit.square_feet = u["Units"]["Unit"]["MinSquareFeet"].to_f
            else
              unit.square_feet = u["Units"]["Unit"]["MaxSquareFeet"].to_f
            end
          end

          unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
            unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
          end

          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
            if u["EffectiveRent"].present?
              unit.market_rent = u["EffectiveRent"]
              unit.effective_rent = u["EffectiveRent"]

            elsif u["Units"]["Unit"]["MarketRent"].present?
              unit.market_rent = u["Units"]["Unit"]["MarketRent"]
              unit.effective_rent = u["Units"]["Unit"]["MarketRent"]

            elsif u["Units"]["Unit"]["UnitRent"].present?
              unit.market_rent = u["Units"]["Unit"]["UnitRent"]
              unit.effective_rent = u["Units"]["Unit"]["UnitRent"]

            else
              unit.market_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
              unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
            end
          end

          unless unit.floor_is_updated.present? && unit.floor_is_updated
            unit.floor = u["FloorLevel"]
          end
          
          unit.availability_url = u["Availability"]["UnitAvailabilityURL"]

          unless unit.availability_is_updated.present? && unit.availability_is_updated
            unit.availability = u["Availability"]["VacancyClass"]
          end

          unless unit.available_is_updated.present? && unit.available_is_updated
            unit.available = false
          end

          if u["Availability"]["VacancyClass"] == "Unoccupied"
            unless unit.available_is_updated.present? && unit.available_is_updated
              unit.available = true
            end

            if u["Availability"].present? && u["Availability"]["VacateDate"].present? 
              availability_attr = u["Availability"]["VacateDate"]["@attributes"]
              vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
            end

            if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
              availability_attr = u["Availability"]["MadeReadyDate"]["@attributes"]
              vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
            end
            
          end

          unless unit.available_date_is_updated.present? && unit.available_date_is_updated
            unit.available_date = vacateDate
          end

          building = u["Units"]["Unit"]["BuildingName"]
          
          unless unit.building_is_updated.present? && unit.building_is_updated
            unit.building = building.present? ? building.gsub("Building ", "") : ""
          end

          # unit.availability_url = u['Availability']['UnitAvailabilityURL'] if u['Availability'].present?
          # unit_floorplan = @all_floorplans_hash[unit.floorplan_id]
          # unit.availability_url = unit_floorplan&.availability_url unless unit.availability_url
          # url_split =  u['Availability']['UnitAvailabilityURL'].split('/') if u['Availability'].present? &&  u['Availability']['UnitAvailabilityURL'].present?
        
          # unit.availability_url_deep_linking = url_split[0]+"//"+url_split[2]+"/Apartments/module/application_authentication/http_referer/"+url_split[2]+"/popup/false/kill_session/1/property[id]/ "+property_id.to_s+"/property_floorplan[id]/"+u["Units"]["Unit"]["@attributes"]["FloorPlanId"].to_s+"/unit_space[id]/"+u["Identification"]["IDValue"].to_s+"/show_in_popup/false/from_check_availability/1/" if url_split.present? rescue ""
          set_availability_url(unit, u)
          unit.manually_updated = false
          import_units << unit
        end
      end
    rescue => e
      raise e
    end
      
    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
    ProvidersDataUpdationService.new().update_availability_of_units(@credentials.community_id, (unit_present - @unit_record))
  end

  def save_psi_floorplans(floorplans,property_id)
    return unless @all_floorplans_hash.present?
    import_floorplans = []

    floorplans.each do |f|
      floorplan = @all_floorplans_hash[f["Identification"]["IDValue"].to_s]

      if floorplan.present?
        puts "----------------- #{floorplan.name} -----------------------\n"
        floorplan.availability_url = f["FloorplanAvailabilityURL"] if f["FloorplanAvailabilityURL"].present?
        floorplan.provider = "psi"

        if f["MarketRent"]["@attributes"]["Min"].to_f > 0
          @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Min"]
        else
          @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Max"]
        end

        if f["MarketRent"]["@attributes"]["Min"].to_f > 0
          floorplan.market_rent = f["MarketRent"]["@attributes"]["Min"]
        else
          floorplan.market_rent = f["MarketRent"]["@attributes"]["Max"]
        end

      else
        floorplan = Floorplan.where(provider: "psi", community_id: @credentials.community_id, provider_floorplan_id: f["Identification"]["IDValue"]).first_or_initialize

        floorplan.property_id = property_id
        floorplan.provider = "psi"

        unless floorplan.name_is_updated.present? && floorplan.name_is_updated
          floorplan.name = f["Name"]
        end

        floorplan.unit_count = f["UnitsAvailable"]
        floorplan.units_available = f["DisplayedUnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
        floorplan.availability_url = f["FloorplanAvailabilityURL"]

        room_types = f["Room"]

        room_types.each do |rt|
          if rt["@attributes"]["RoomType"] == "Bedroom"
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
          if f["SquareFeet"]["@attributes"]["Min"].to_f > 0
            floorplan.square_feet = f["SquareFeet"]["@attributes"]["Min"]
          else
            floorplan.square_feet = f["SquareFeet"]["@attributes"]["Max"]
          end
        end

        if f["MarketRent"]["@attributes"]["Min"].to_f > 0
          @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Min"]
        else
          @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Max"]
        end

        unless floorplan.market_rent_is_updated.present? && floorplan.market_rent_is_updated
          if f["MarketRent"]["@attributes"]["Min"].to_f > 0
            floorplan.market_rent = f["MarketRent"]["@attributes"]["Min"]
          else

            floorplan.market_rent = f["MarketRent"]["@attributes"]["Max"]
          end
        end

      end

      import_floorplans << floorplan
    end

    ProvidersDataUpdationService.new().update_or_create_floorplans_records(import_floorplans)
  end

  def fill_psi_pricing_details()
    return unless @all_units_hash.present?

    floorplanHash = Hash.new
    property_ids = @credentials.property_id.split(',') rescue []
    
    property_ids.each do |property_id|
      move_in_dates = getMoveInDate(property_id)
      move_in_dates << "0" unless move_in_dates.present?

      move_in_dates.compact.uniq.each do |move_in_date|
        response = get_units_pricing(property_id, move_in_date)
        is_unit_space_enabled ? unit_space_enabled_pricing_update(response) : unit_space_disabled_pricing_update(response)
      end
    end

  end

  def unit_space_enabled_pricing_update response
    import_units = []

    if response.dig("response", "code") == 200
      psi_units = response.dig("response", "result", "PropertyUnits", "PropertyUnit")

      if psi_units.present?
        psi_units.each do |u|
          u['UnitSpace'].each do |us|
            unit = get_psi_space_matched_unit(u, us)

            if unit.present?
              puts "----------------------------- Updating pricing for: #{unit.marketing_name} ------------------------\n"
              import_units << update_unit_pricing_and_availability(us, unit)
            end
          end
        end
      end

    end

    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
  end

  def unit_space_disabled_pricing_update response
    import_units = []

    if response.dig("response", "code") == 200
      psi_units = response.dig("response", "result", "ILS_Units", "Unit")

      if psi_units.present?
        psi_units.each do |u|
          unit = get_psi_space_matched_unit(u[1], nil)

          if unit.present?
            puts "----------------------------- Updating pricing for: #{unit.marketing_name} ------------------------\n"
            import_units << update_unit_pricing_and_availability(u, unit)
          end
        end
      end
    end

    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
  end

  def update_unit_pricing_and_availability us, unit

    unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
      if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
        unit.availability = 'Unoccupied' if !unit.sold
        unit.available = true if !unit.sold
      else
        unit.availability = 'Occupied'
        unit.available = false
      end
    end

    if us[1]["@attributes"]["AvailableOn"].present?
      date = us[1]["@attributes"]["AvailableOn"]
      dateSplit = date.split('/')
      day = dateSplit[0]
      month = dateSplit[1]
      year = dateSplit[2]
      unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
        unit.available_date = Date.parse("#{month}-#{day}-#{year}")
      end
    end

    unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
      if (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).present? && (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_i > 0
        unit.min_effective_rent = (us[1]["Rent"]["@attributes"]['MinRent'].gsub(/[\s,]/ ,"")).to_f
        unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
      else
        unit.min_effective_rent = 0
      end

      if (us[1]["Rent"]["@attributes"]["MaxRent"].gsub(/[\s,]/ ,"")).present? && (us[1]["Rent"]["@attributes"]["MaxRent"].gsub(/[\s,]/ ,"")).to_i > 0
        unit.max_effective_rent = (us[1]["Rent"]["@attributes"]['MaxRent'].gsub(/[\s,]/ ,"")).to_f
      else
        unit.max_effective_rent = 0 
      end
    end

    rentStr = ""
    begin

      if us[1]["Rent"]["TermRent"].count > 1
        us[1]["Rent"]["TermRent"].each do |tr|
          rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +"::\;"
        end
      end

    rescue => rt_ex
      raise rt_ex
    end

    unit.lease_pricing = rentStr

    unit
  end

  def is_unit_space_enabled
    ActiveRecord::Type::Boolean.new.cast(@credentials&.entrata_show_unit_spaces)
  end

  def getMoveInDate(property_id)
    response = get_move_in_dates(property_id)
    moveIn_dates = []
  
    if response.present? && response.dig('response', 'code') == 200
      lease_periods = response.dig('response', 'result', 'Property', 0, 'leasePeriods', 'leasePeriod')
  
      if lease_periods.present?
        lease_periods.each do |dates|
          if dates['leaseStartDate'].present?
            ss = dates['leaseStartDate'].split('/')
            date1 = "#{ss[2]}-#{ss[0]}-#{ss[1]}".to_date + 31
            moveIn_dates << date1.strftime("%m/%d/%Y")
          end
        end
      end
    end
  
    moveIn_dates
  end
  
  def get_psi_matched_unit u
    unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s
    space_id = u["Identification"]["IDValue"].to_s
    marketing_name = u["Units"]["Unit"]["MarketingName"]

    unit = @all_units_hash["#{unit_id}-#{marketing_name}"]
    unit = @all_units_hash["#{unit_id}"] unless unit.present?
    unit = @all_units_hash["#{unit_id}-#{space_id}"] unless unit.present?
    unit= @all_units_hash["#{unit_id}-#{unit_id}"] unless unit.present?
    unit = @all_units_hash.select { |key, value| key.to_s.include?(unit_id) }&.values[0] unless unit.present?
    unit
  end

  def get_psi_space_matched_unit u, us
    unit_id = us.present? ? u["@attributes"]["Id"].to_s : u["@attributes"]["PropertyUnitId"].to_s
    unit = @all_units_hash[(unit_id+"-"+u["@attributes"]["UnitNumber"].to_s)]
    unit = @all_units_hash[(unit_id+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)])] unless unit.present?
    unit = @all_units_hash[(unit_id+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s)] if !unit.present? && us.present?
    unit = @all_units_hash[(unit_id+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s)] if !unit.present? && us.present?
    unit = @all_units_hash[(unit_id)] unless unit.present?
    unit = @all_units_hash[(unit_id+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 1)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s)] if !unit.present? && us.present?
    unit = @all_units_hash[(unit_id+"-"+(us[1]["@attributes"]["Id"].to_s))] if !unit.present? && us.present?
    unit = @all_units_hash[(unit_id+"-"+unit_id)] unless unit.present?
    unit = @all_units_hash.select { |key, value| key.to_s.include?(unit_id) }&.values[0] unless unit.present?
    unit 
  end

  def get_move_in_dates property_id
    response = HTTParty.post(get_move_in_dates_endpoint(),
      :body => {
        "auth": {
          "type": "basic",
          "password": @credentials.password,
          "username": @credentials.username
        },
        "requestId": 15,
        "method": {
          "name": "getPropertyPickLists",
          "version":"r1",
          "params": {
            "propertyIds": property_id
          }
        }
      }.to_json,
      :headers => { 'Content-Type' => 'application/json' } )
    
    JSON.parse(response.body)
  end

  def get_units_pricing property_id, move_in_date
    response = HTTParty.post(get_units_pricing_endpoint(),
      :body => {
        "auth": {
          "type": "basic",
          "password": @credentials.password,
          "username": @credentials.username
        },
        "method": {
          "name": "getUnitsAvailabilityAndPricing",
          "params": get_pricing_params(property_id, move_in_date)
        }
      }.to_json,
      :headers => { 'Content-Type' => 'application/json' } )

    JSON.parse(response.body)
  end

  def get_pricing_params property_id, move_in_date
    {
      "propertyId": property_id,
      "availableUnitsOnly": @credentials&.entrata_available_units_only,
      "showUnitSpaces": @credentials&.entrata_show_unit_spaces,
      "useSpaceConfiguration": @credentials&.entrata_use_space_configuration,
    }.merge(move_in_date_param(move_in_date))
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

  def get_units_pricing_endpoint
    if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
      url = @credentials.entrata_url
    else
      url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
    end

    url
  end

  def get_move_in_dates_endpoint
    if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
      url = @credentials.entrata_url
    else
      url = "https://#{@credentials.entrata_url}.entrata.com/api/v1/properties"
    end

    url
  end

  def move_in_date_param move_in_date
    h_move_in_date = (move_in_date.present? && move_in_date != "0") ? { "moveInStartDate": move_in_date } : {}
  end

  def set_availability_url(unit, u)
    availability = u['Availability']
    unit.availability_url = availability['UnitAvailabilityURL'] if availability.present?
  
    unit_floorplan = @all_floorplans_hash[unit.floorplan_id]
    unit.availability_url ||= unit_floorplan&.availability_url
  
    if availability.present? && availability['UnitAvailabilityURL'].present?
      url_split = availability['UnitAvailabilityURL'].split('/')
      property_id = u.dig('Identification', 'IDValue')
      floor_plan_id = u.dig('Units', 'Unit', '@attributes', 'FloorPlanId')
      unit_id = u.dig('Identification', 'IDValue')
      lease_month = lease_month(unit)
      lease_start_date = lease_start_date(unit)
  
      if url_split.present?
        unit.availability_url_deep_linking = "#{url_split[0]}//#{url_split[2]}/Apartments/module/application_authentication/http_referer/#{url_split[2]}/popup/false/kill_session/1/property[id]/#{property_id.to_s}/property_floorplan[id]/#{floor_plan_id.to_s}/unit_space[id]/#{unit_id.to_s}/show_in_popup/false/from_check_availability/1/term_month/#{lease_month}/selected_occupancy_type[id]/1/?lease_start_date=#{lease_start_date}"
      end
    end
  rescue StandardError => e
    unit.availability_url_deep_linking = ''
    puts "Error occurred: #{e.message}"
  end

  def lease_start_date unit
    if unit.available_date.present? && unit.available_date > Date.today
      unit.available_date.strftime('%m/%d/%Y') 
    else
      Date.today.strftime('%m/%d/%Y')
    end
  end

  def lease_month unit
    return 12 unless unit.lease_pricing.present?
    unit.lease_pricing.split("::;").map{|s| s.split(":")}.sort_by { |item| item[1].to_f }[0][0]
  rescue StandardError => e
    12
  end

  def update_additional_fee_and_pricing(community, response)
    if community.display_additional_fee && !community.display_manual_additional_fee 
      property = fetch_property_data(response)
      categorized_list = generate_categorized_fee_list(property)
      update_community_with_fees(community, categorized_list)
    end
  end
  
  def fetch_property_data(response)
    response.dig("response", "result", "PhysicalProperty", "Property")
  end
  
  def generate_categorized_fee_list(property)
    pet_fees = property.dig(0, "Policy", "Pet")
    application_fees = property.dig(0, "Fee", "ApplicationFee")

    [
      format_category("Application Fees", format_application_fee_list(application_fees)),
      format_category("Pet Fees", format_pet_fee_list(pet_fees))
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
  
  def format_pet_fee_list(pet_policies)
    return "" unless pet_policies
  
    pet_policies.filter_map do |pet_policy|
      pet_type = pet_policy.dig("Pets", "@attributes", "PetType")
      rent = pet_policy["Rent"].to_i
      fee = pet_policy["Fee"].to_i
  
      details = []
      details << "$#{fee} - Pet Fee (#{pet_type})" if fee.positive?
      details << "$#{rent} - Pet Rent (#{pet_type})" if rent.positive?
  
      details.any? ? "<li>#{details.join(', ')}</li>" : nil
    end.join
  end
  

  def format_application_fee_list(application_fees)
    return "" unless application_fees
  
    application_fees.filter_map do |app_fee|

      type = app_fee.dig("@attributes", "Type")
      amount = app_fee.dig("@attributes", "Amount").to_i
      next if amount.zero?
  
      "<li>$#{amount} - #{type}</li>"
    end.join
  end
  
end