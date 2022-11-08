class PsiService < BaseService
  @@floorplanHash = Hash.new
  def perform
    @unit_record = []
    begin
      com_test = Community.find credentials.community_id
      com_test.entrata_exception_logs = "" unless com_test.entrata_exception_logs.present?
      com_test.entrata_exception_logs = com_test.entrata_exception_logs + "Before call logs -"+Time.now.to_s + "-"
      PaperTrail.enabled = false
      com_test.save
      PaperTrail.enabled = true
    rescue => ex
    end

    property_ids = credentials.property_id.split(',') rescue []

    property_ids.each do |property_id|
      begin

        if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
          url = credentials.entrata_url
        else
          url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        end

        password = credentials.password
        username = credentials.username

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
                                             "availableUnitsOnly": credentials&.entrata_available_units_only,
                                             "showUnitSpaces": credentials&.entrata_show_unit_spaces
                                         }
                                     }
                                 }.to_json,
                                 :headers => { 'Content-Type' => 'application/json' } )
        response =  JSON.parse(response.body)

        sleep 2
        
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
          save_psi_units(units, property_id)
          com_test&.community_data_updated_on()

          begin
            cred = Credential.find credentials.id
            cred.data_error_message = nil
            PaperTrail.enabled = false
            cred.save
            PaperTrail.enabled = true

          rescue => err
          end

        else
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
        begin
          cred = Credential.find credentials.id
          cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
          PaperTrail.enabled = false
          cred.save
          PaperTrail.enabled = true
        
        rescue => err
        end

        begin
          com = Community.find credentials.community_id
          unless com.entrata_exception_logs.present?
            com.entrata_exception_logs = ""
          end
          com.entrata_exception_logs = Time.now.to_s + com.entrata_exception_logs + "|||||||MITS|||||||| " + com.id.to_s + "--- "+ e.message
          PaperTrail.enabled = false
          com.save
          PaperTrail.enabled = true
        
        rescue => p
        end

      end
    end

    begin
      com_test = Community.find credentials.community_id
      com_test.entrata_exception_logs = "" unless com_test.entrata_exception_logs.present?
      com_test.entrata_exception_logs = com_test.entrata_exception_logs + "After call logs -"+Time.now.to_s + "-  =========================="
      PaperTrail.enabled = false
      com_test.save
      PaperTrail.enabled = true
    
    rescue => ex
    end

    fill_psi_pricing_details()
  end

  def save_psi_units(units,property_id)
    import_units = []
    unit_present =  Unit.where("community_id = ? AND provider IN (?)", credentials.community_id,  ["psi"]).map{|x| x.provider_unit_id}
    units.each do |u|
      vacateDate = ""
      unit = Unit.where(community_id: credentials.community_id, provider_unit_id: get_provider_unit_id(u) ).first_or_initialize
    
      if unit&.id.present?
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
        unit.provider = "psi"
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s

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

        unit.availability_url = u['Availability']['UnitAvailabilityURL'] if u['Availability'].present?
        unit.availability_url = unit.floorplan.availability_url unless unit.availability_url
        url_split =  u['Availability']['UnitAvailabilityURL'].split('/') if u['Availability'].present? &&  u['Availability']['UnitAvailabilityURL'].present?
      
        unit.availability_url_deep_linking = url_split[0]+"//"+url_split[2]+"/Apartments/module/application_authentication/http_referer/"+url_split[2]+"/popup/false/kill_session/1/property[id]/ "+property_id.to_s+"/property_floorplan[id]/"+u["Units"]["Unit"]["@attributes"]["FloorPlanId"].to_s+"/unit_space[id]/"+u["Identification"]["IDValue"].to_s+"/show_in_popup/false/from_check_availability/1/" if url_split.present? rescue ""
      
        @unit_record << unit.provider_unit_id
        import_units << unit      
      else
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
        unit.property_id = property_id
        unit.provider = "psi"
        unit.unit_type = u["Units"]["Unit"]["UnitType"]

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

        unit.availability_url = u['Availability']['UnitAvailabilityURL'] if u['Availability'].present?
        unit.availability_url = unit.floorplan.availability_url unless unit.availability_url
        url_split =  u['Availability']['UnitAvailabilityURL'].split('/') if u['Availability'].present? &&  u['Availability']['UnitAvailabilityURL'].present?
      
        unit.availability_url_deep_linking = url_split[0]+"//"+url_split[2]+"/Apartments/module/application_authentication/http_referer/"+url_split[2]+"/popup/false/kill_session/1/property[id]/ "+property_id.to_s+"/property_floorplan[id]/"+u["Units"]["Unit"]["@attributes"]["FloorPlanId"].to_s+"/unit_space[id]/"+u["Identification"]["IDValue"].to_s+"/show_in_popup/false/from_check_availability/1/" if url_split.present? rescue ""
      
        unit.manually_updated = false

        import_units << unit
      end
    end
      
    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)

    update_availability_of_units((unit_present - @unit_record))
  end

  def save_psi_floorplans(floorplans,property_id)
    import_floorplans = []
    floorplans.each do |f|
      floorplan = Floorplan.where(community_id: credentials.community_id, provider_floorplan_id: f["Identification"]["IDValue"]).first_or_initialize

      if floorplan&.id.present?
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
    import_units = []
    floorplanHash = Hash.new
    property_ids = credentials.property_id.split(',') rescue []

    property_ids.each do |property_id|
      move_in_dates = getMoveInDate(property_id)
      move_in_dates << "0" unless move_in_dates.present?

      move_in_dates.each do |move_in_date|
        response = get_units_pricing(property_id, move_in_date)

        if response["response"]["code"] == 200
          psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
          psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]

          psi_units.each do |u|
            u['UnitSpace'].each do |us|
              begin
                unit = Unit.where(provider_unit_id: get_space_unit_identifier(u, us), community_id: credentials.community_id).first
                
                if unit.present?
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
                  end

                  unit.lease_pricing = rentStr
                  import_units << unit
                end

              rescue => ex
                begin
                  com = Community.find credentials.community_id
                  unless com.entrata_exception_logs.present?
                    com.entrata_exception_logs = ""
                  end
                  com.entrata_exception_logs = Time.now.to_s + com.entrata_exception_logs + "|||||||Pricing|||||||| " + com.id.to_s + "--- "+ e.message
                  PaperTrail.enabled = false
                  com.save
                  PaperTrail.enabled = true
                rescue => r
                end
              end

            end
          end
        end        
      end
    end

    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
  end

  def getMoveInDate(property_id)
    response = get_move_in_dates(property_id)
    moveIn_dates = []

    response['response']['result']['Property'][0]['leasePeriods']['leasePeriod'].each do |dates|
      if dates['leaseStartDate'].present?
        ss = dates['leaseStartDate'].split('/')
        date1 = ss[2] + "-" +ss[0] + "-" + ss[1]
        date1 = (date1.to_date + 31).to_s
        ss = date1.split('-')
        added_date = ss[1] + "/" + ss[2] + "/" + ss[0]
        moveIn_dates << added_date
      end
    end

    moveIn_dates
  end

  def save_website_column_of_community(response)
    community = Community.find credentials.community_id
  end

  def get_provider_unit_id u
    [ 
      (u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"]),
      u["Units"]["Unit"]["Identification"]["IDValue"].to_s,
      (u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s)
    ]
  end

  def update_availability_of_units no_availbale_units_provider_ids
    Unit.where(community_id: credentials.community_id, manual_override: false, provider_unit_id: no_availbale_units_provider_ids).update_all(availability: "Occupied", available: false, available_date: nil)
  end

  def get_space_unit_identifier u, us
    [
      (u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s),
      (u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]),
      (u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s),
      (u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s),
      (u["@attributes"]["Id"].to_s),
      (u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 1)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s),
      (u["@attributes"]["Id"].to_s+"-"+(us[1]["@attributes"]["Id"].to_s))
    ]
  end

  def get_move_in_dates property_id
    response = HTTParty.post(get_move_in_dates_endpoint(),
      :body => {
        "auth": {
          "type": "basic",
          "password": credentials.password,
          "username": credentials.username
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
          "password": credentials.password,
          "username": credentials.username
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
      "availableUnitsOnly": credentials&.entrata_available_units_only,
      "showUnitSpaces": credentials&.entrata_show_unit_spaces,
      "useSpaceConfiguration": credentials&.entrata_use_space_configuration,
    }.merge(move_in_date_param(move_in_date))
  end

  def get_units_pricing_endpoint
    if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
      url = credentials.entrata_url
    else
      url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
    end

    url
  end

  def get_move_in_dates_endpoint
    "https://#{credentials.entrata_url}.entrata.com/api/v1/properties"
  end

  def move_in_date_param move_in_date
    h_move_in_date = (move_in_date.present? && move_in_date != "0") ? { "moveInStartDate": move_in_date } : {}
  end
end