class PsiSwapService < BaseService
  @@floorplanHash = Hash.new
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
    @unit_record = []
    @all_units_hash = ProvidersDataUpdationService.new().get_all_units_hash(@credentials.community_id, "psi")
    @all_floorplans_hash = ProvidersDataUpdationService.new().get_all_floorplans_hash(@credentials.community_id, "psi")
  end

  def perform
    com_test = Community.find @credentials.community_id
    @space_details = UnitSpaceDetails::Collector.new(com_test, @credentials)
    property_ids = @credentials.property_id.split(',') rescue []
    @credentials&.get_limit_result_availability()&.each do |limit_result|
      property_ids.each do |property_id|
        begin
          @@floorplanHash = {}
          response = PsiService.call_entrata_api(
            subdomain: @credentials.entrata_url,
            endpoint: "propertyunits",
            method: :post,
            payload: {
              method: {
                name: "getMitsPropertyUnits",
                params: {
                  propertyIds: property_id,
                  availableUnitsOnly: limit_result, #credentials&.entrata_available_units_only,
                  showUnitSpaces: credentials&.entrata_show_unit_spaces
                }
              }
            }
          )
          response =  JSON.parse(response.body)
          if response["response"]["code"] == 200
            units = []
            floorplans = []
            response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
              pro["ILS_Unit"].each do |ils|
                units << ils
              end
              pro["Floorplan"].each do |f|
                floorplans << f
              end
            end
            
            save_psi_floorplans(floorplans, property_id)
            save_psi_units(units, property_id, limit_result)

            # Both feeds already carry per-space letters, amenities and lease terms; the
            # collector keeps whatever is there and writes once, after the units commit.
            @space_details&.absorb(response, feed: :catalog)

          end

        rescue => e
          raise e
        end
      end
    
      fill_psi_pricing_details(limit_result)
    end

    @space_details.flush!
    rename_provider()
  end

  def save_psi_units(units, property_id, limit_result)
    units.each do |u|

      vacateDate = ""

      unit = Unit.find_by(community_id: @credentials.community_id, provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"])

      unless unit.present?
        unit = Unit.find_by(community_id: @credentials.community_id, provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s)
      end

      unless unit.present?
        unit = Unit.find_by(community_id: @credentials.community_id, provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s)
      end

      # Fallback: match by unit number when Entrata internal IDs have changed (e.g. switching Entrata systems)
      unless unit.present?
        unit = Unit.find_by(community_id: @credentials.community_id, marketing_name: u["Units"]["Unit"]["MarketingName"], provider: "psi")
      end

      if unit.present?
        unit.provider = "psi_new"
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit_status_update(unit, u)
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"]

        if u["Units"]["Unit"]["MinSquareFeet"].present?
          if u["Units"]["Unit"]["MinSquareFeet"].to_f > 1
            unit.square_feet = u["Units"]["Unit"]["MinSquareFeet"].to_f
          else
            unit.square_feet = u["Units"]["Unit"]["MaxSquareFeet"].to_f
          end
        end

        unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]

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

        unit.floor = u["FloorLevel"]
        unit.availability = u["Availability"]["VacancyClass"]
        
        if u["Availability"]["VacancyClass"] == "Unoccupied"
          if u["Availability"].present? && u["Availability"]["VacateDate"].present? 
            availability_attr = u["Availability"]["VacateDate"]["@attributes"]
            vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
          end
  
          if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
            availability_attr = u["Availability"]["MadeReadyDate"]["@attributes"]
            vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
          end
        end
        
        unit.available_date = vacateDate

        building = u["Units"]["Unit"]["BuildingName"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        set_availability_url(unit, u, property_id)
        unit.show_on_map = limit_result
        
        unit.save(validate: false)
      else
        unit = Unit.new
        unit.community_id = @credentials.community_id
        unit.provider = "psi_new"
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit_status_update(unit, u)
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
        unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]

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

        if u["Units"]["Unit"]["MinSquareFeet"].present?
          if u["Units"]["Unit"]["MinSquareFeet"].to_f > 1
            unit.square_feet = u["Units"]["Unit"]["MinSquareFeet"].to_f
          else
            unit.square_feet = u["Units"]["Unit"]["MaxSquareFeet"].to_f
          end
        end

        unit.floor = u["FloorLevel"]
        unit.availability = u["Availability"]["VacancyClass"]
        
        if u["Availability"]["VacancyClass"] == "Unoccupied"
          if u["Availability"].present? && u["Availability"]["VacateDate"].present? 
            availability_attr = u["Availability"]["VacateDate"]["@attributes"]
            vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
          end
  
          if u["Availability"].present? && u["Availability"]["MadeReadyDate"].present?
            availability_attr = u["Availability"]["MadeReadyDate"]["@attributes"]
            vacateDate = Date.parse("#{availability_attr["Year"]}-#{availability_attr["Month"]}-#{availability_attr["Day"]}")
          end
        end

        unit.available_date = vacateDate
        building = u["Units"]["Unit"]["BuildingName"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""

        set_availability_url(unit, u, property_id)
        unit.show_on_map = limit_result

        unit.save(validate: false)
      end
    end

  end

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|

      floorplan = Floorplan.where(community_id: @credentials.community_id,name: f["Name"])
      if floorplan.count > 1
        floorplan = Floorplan.where(community_id: @credentials.community_id,name: f["Name"],square_feet: f["SquareFeet"]["@attributes"]["Min"],bedrooms: f["Room"][0]["Count"],bathrooms: f["Room"][1]["Count"])
      end
      if floorplan.present?
        floorplan = floorplan.first
        floorplan.provider = "psi_new"
        floorplan.provider_floorplan_id = f["Identification"]["IDValue"]
        floorplan.property_id = property_id
        floorplan.name = f["Name"]
        floorplan.unit_count = f["UnitsAvailable"]
        floorplan.units_available = f["DisplayedUnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
        floorplan.availability_url = f["FloorplanAvailabilityURL"]

        room_types = f["Room"]
        room_types.each do |rt|
          if rt["@attributes"]["RoomType"] == "Bedroom"
            floorplan.bedrooms = rt["Count"]
          else
            floorplan.bathrooms = rt["Count"]
          end
        end

        if f["SquareFeet"]["@attributes"]["Min"].to_f > 0

          floorplan.square_feet = f["SquareFeet"]["@attributes"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["@attributes"]["Max"]
        end
        
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
        add_floorplan_images(floorplan, f['File'])
        floorplan.save
      else
        floorplan = Floorplan.new
        floorplan.community_id = @credentials.community_id
        floorplan.provider_floorplan_id = f["Identification"]["IDValue"]
        floorplan.provider = "psi_new"
        floorplan.property_id = property_id
        floorplan.name = f["Name"]
        floorplan.unit_count = f["UnitsAvailable"]
        floorplan.units_available = f["DisplayedUnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
        floorplan.availability_url = f["FloorplanAvailabilityURL"]

        room_types = f["Room"]
        room_types.each do |rt|
          if rt["@attributes"]["RoomType"] == "Bedroom"
            floorplan.bedrooms = rt["Count"]
          else
            floorplan.bathrooms = rt["Count"]
          end
        end

        if f["SquareFeet"]["@attributes"]["Min"].to_f > 0
          floorplan.square_feet = f["SquareFeet"]["@attributes"]["Min"]
        else
          floorplan.square_feet = f["SquareFeet"]["@attributes"]["Max"]
        end

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

        add_floorplan_images(floorplan, f['File'])
        floorplan.save
      end
    end


  end

  def add_floorplan_images fp, image_urls
    primary_image = fetch_floorplan_image_url(image_urls, 0)
    secondary_image = fetch_floorplan_image_url(image_urls, 1)
    fp.image = image_base64(primary_image) if primary_image.present?
    fp.secondary_image = image_base64(secondary_image) if secondary_image.present?
  end

  def fetch_floorplan_image_url image_urls, index
    return unless image_urls.present?
    image_urls[index]['Src'] rescue nil
  end

  def fill_psi_pricing_details limit_result
    floorplanHash = Hash.new
    property_ids = @credentials.property_id.split(',') rescue []

    property_ids.each do |property_id|
      move_in_dates = getMoveInDate(property_id)
      move_in_dates << "0" unless move_in_dates.present?

      move_in_dates.compact.uniq.each do |move_in_date|
        response = get_units_pricing(property_id, move_in_date, limit_result)
        @space_details&.absorb(response, feed: :pricing)
        is_unit_space_enabled ? unit_space_enabled_pricing_update(response) : unit_space_disabled_pricing_update(response)
      end
    end

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

  def get_move_in_dates property_id
    response = PsiService.call_entrata_api(
      subdomain: @credentials.entrata_url,
      endpoint: "properties",
      method: :post,
      payload: {
        requestId: 15,
        method: {
          name: "getPropertyPickLists",
          version: "r1",
          params: {
            propertyIds: property_id
          }
        }
      }
    )

    JSON.parse(response.body)
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
      psi_units = response.dig("response", "result", "ILS_Units", "Unit") rescue []

      if psi_units.present?
        psi_units.each do |u|
          unit = get_psi_space_matched_unit(u[1], nil)

          if unit.present?
            import_units << update_unit_pricing_and_availability(u, unit)
          end
        end
      end
    end

    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
  end

  def update_unit_pricing_and_availability us, unit
    return if unit.manual_override

    unless unit.availability_is_updated.present? && unit.availability_is_updated
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
      unless unit.available_date_is_updated.present? && unit.available_date_is_updated
        unit.available_date = Date.parse("#{month}-#{day}-#{year}")
      end
    end

    unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
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

  def is_unit_space_enabled
    ActiveRecord::Type::Boolean.new.cast(@credentials&.entrata_show_unit_spaces)
  end

  def get_units_pricing property_id, move_in_date, limit_result
    response = PsiService.call_entrata_api(
      subdomain: @credentials.entrata_url,
      endpoint: "propertyunits",
      method: :post,
      payload: {
        method: {
          name: "getUnitsAvailabilityAndPricing",
          params: get_pricing_params(property_id, move_in_date, limit_result)
        }
      }
    )

    JSON.parse(response.body)
  end

  def get_pricing_params property_id, move_in_date, limit_result
    {
      propertyId: property_id,
      availableUnitsOnly: limit_result,
      showUnitSpaces: @credentials&.entrata_show_unit_spaces,
      useSpaceConfiguration: @credentials&.entrata_use_space_configuration,
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

  def move_in_date_param move_in_date
    h_move_in_date = (move_in_date.present? && move_in_date != "0") ? { moveInStartDate: move_in_date } : {}
  end

  def rename_provider
    Floorplan.where(community_id: @credentials.community_id, provider: "psi").delete_all
    Floorplan.where(community_id: @credentials.community_id, provider: "psi_new").update_all(provider: "psi")
    Unit.where(community_id: @credentials.community_id, provider: "psi").delete_all
    Unit.where(community_id: @credentials.community_id, provider: "psi_new").update_all(provider: "psi")
  end

  def set_availability_url(unit, u, property_id = nil)
    availability = u['Availability']
    unit.availability_url = availability['UnitAvailabilityURL'] if availability.present?
  
    unit_floorplan = @all_floorplans_hash[unit.floorplan_id]
    unit.availability_url ||= unit_floorplan&.availability_url
  
    if availability.present? && availability['UnitAvailabilityURL'].present?
      url_split = availability['UnitAvailabilityURL'].split('/')
      property_id = entrata_property_id(unit, u, property_id)
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

  # The Entrata property the deep link belongs to.
  #
  # This used to read ILS_Unit/Identification/IDValue, which is the *UnitSpaceID* — so
  # every link ever generated carried property[id]/<space id>. That id is correct for
  # unit_space[id], which is why the links still resolved to the right space, but it
  # names no property. Prefer the id the sync was actually run for; fall back to the one
  # stored on the unit, then to the first segment of OrganizationName
  # ("100152889~..~4455543~..~a"), which carries it in-record.
  def entrata_property_id(unit, u, sync_property_id)
    sync_property_id.presence ||
      unit.property_id.presence ||
      u.dig('Identification', 'OrganizationName').to_s.split('~..~').first.presence
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
end