class PsiSwapService < BaseService
  @@floorplanHash = Hash.new
  def perform
    com_test = Community.find credentials.community_id
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        @@floorplanHash = {}
        if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
          url = credentials.entrata_url
        else
          url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        end
        password = credentials.password
        username = credentials.username
        #property_id = credentials.property_id
        #######
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
        if response["response"]["code"] == 200
          units = []
          floorplans = []
          # Unit.where(community_id: credentials.community_id, provider: "psi_new").destroy_all
          # Floorplan.where(community_id: credentials.community_id, provider: "psi_new").delete_all
          response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
            pro["ILS_Unit"].each do |ils|
              units << ils
            end
            pro["Floorplan"].each do |f|
              floorplans << f
            end
          end
          
          save_psi_floorplans(floorplans,property_id)
          save_psi_units(units,property_id)

          # save_website_column_of_community(response)
          end
      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
    fill_psi_pricing_details
    rename_provider
  end

  def save_psi_units(units,property_id)
    units.each do |u|

      vacateDate = ""

      # unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Units"]["Unit"]["MarketingName"])
      # if unit.count > 1
      #   unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Units"]["Unit"]["MarketingName"],floorplan_id: Floorplan.find_by(name: u["Units"]["Unit"]["UnitType"], community_id: credentials.community_id).provider_floorplan_id)
      # end
      # if unit.count > 1
      #   unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Units"]["Unit"]["MarketingName"],building: u["Units"]["Unit"]["BuildingName"].present? ? u["Units"]["Unit"]["BuildingName"].gsub("Building ", "") : "")
      # end

      unit = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"])#.first_or_initialize
      
      unless unit.present?
        unit = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s)#.first_or_initialize
      end

      unless unit.present?
        unit = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s)#.first_or_initialize
      end
      
      puts "******************psi swap*******************"*20
      puts unit.inspect
      puts "*************************************"*20

      if unit.present?
        # unit = unit.first
        unit.provider = "psi_new"
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
        if u["Units"]["Unit"]["MinSquareFeet"].present?
          if u["Units"]["Unit"]["MinSquareFeet"].to_f > 1
            unit.square_feet = u["Units"]["Unit"]["MinSquareFeet"].to_f
          else
            unit.square_feet = u["Units"]["Unit"]["MaxSquareFeet"].to_f
          end
        end
        unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
        # unit.effective_rent = 1.0 #Setting rent to avoid validation issues

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
        unit.availability_url = unit.floorplan.availability_url unless unit.availability_url
        url_split =  u['Availability']['UnitAvailabilityURL'].split('/') if u['Availability'].present? &&  u['Availability']['UnitAvailabilityURL'].present?
      
        unit.availability_url_deep_linking = url_split[0]+"//"+url_split[2]+"/Apartments/module/application_authentication/http_referer/"+url_split[2]+"/popup/false/kill_session/1/property[id]/ "+property_id.to_s+"/property_floorplan[id]/"+u["Units"]["Unit"]["@attributes"]["FloorPlanId"].to_s+"/unit_space[id]/"+u["Identification"]["IDValue"].to_s+"/show_in_popup/false/from_check_availability/1/" if url_split.present? rescue ""
      
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.save(validate: false)
      else
        # dup = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"])#.first_or_initialize
      
        # unless dup.present?
        #   dup = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s)#.first_or_initialize
        # end
  
        # unless dup.present?
        #   dup = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s)#.first_or_initialize
        # end     

        # if dup.present?
        #   dup.destroy
        # end
        
        # unit = Unit.where(community_id: credentials.community_id).first
        unit = Unit.new
        unit.community_id = credentials.community_id
        unit.provider = "psi_new"
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Identification"]["IDValue"].to_s
        unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]

        # unit.effective_rent = 1.0 #Setting rent to avoid validation issues
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

        unit.availability_url = unit.floorplan.availability_url unless unit.availability_url
        url_split =  u['Availability']['UnitAvailabilityURL'].split('/') if u['Availability'].present? &&  u['Availability']['UnitAvailabilityURL'].present?
      
        unit.availability_url_deep_linking = url_split[0]+"//"+url_split[2]+"/Apartments/module/application_authentication/http_referer/"+url_split[2]+"/popup/false/kill_session/1/property[id]/ "+property_id.to_s+"/property_floorplan[id]/"+u["Units"]["Unit"]["@attributes"]["FloorPlanId"].to_s+"/unit_space[id]/"+u["Identification"]["IDValue"].to_s+"/show_in_popup/false/from_check_availability/1/" if url_split.present? rescue ""
      
        unit.available_date = vacateDate
        building = u["Units"]["Unit"]["BuildingName"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.save(validate: false)

      end
    end
    # Unit.where(community_id: credentials.community_id, provider: "psi_new").destroy_all
    # unit.each do |d|
    #   unless d.provider == "psi_new" || d.provider == "manually"
    #     d.destroy
    #   end
    # end

  end

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|

      floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"])
      if floorplan.count > 1
        floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"],square_feet: f["SquareFeet"]["@attributes"]["Min"],bedrooms: f["Room"][0]["Count"],bathrooms: f["Room"][1]["Count"])
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
        floorplan.save
      else
        # dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"])
        # if dup.present?
        #   dup.destroy
        # end
        # floorplan = Floorplan.where(community_id: credentials.community_id).first
        # c = Community.find(credentials.community_id)
        floorplan = Floorplan.new
        floorplan.community_id = credentials.community_id
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

        floorplan.save
      end
    end


  end

  def fill_psi_pricing_details
    floorplanHash = Hash.new
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      move_in_dates = getMoveInDate(property_id)
      unless move_in_dates.present?
        move_in_dates = []
        move_in_dates << "0"
      end
      ########################################## Space configuration
      move_in_dates.each do |move_in_date|
        begin
          if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
            url = credentials.entrata_url
          else
            url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
          end
          password = credentials.password
          username = credentials.username
          #property_id = credentials.property_id
          if move_in_date == "0"
            response = HTTParty.post(url,
                                     :body => {
                                         "auth": {
                                             "type": "basic",
                                             "password": password,
                                             "username": username
                                         },
                                         "method": {
                                             "name": "getUnitsAvailabilityAndPricing",
                                             "params": {
                                                 "propertyId": property_id,
                                                 "availableUnitsOnly": credentials&.entrata_available_units_only,
                                                 "showUnitSpaces": credentials&.entrata_show_unit_spaces,
                                                 "useSpaceConfiguration": credentials&.entrata_use_space_configuration
                                             }
                                         }
                                     }.to_json,
                                     :headers => { 'Content-Type' => 'application/json' } )
            response =  JSON.parse(response.body)
          else
            response = HTTParty.post(url,
                                     :body => {
                                         "auth": {
                                             "type": "basic",
                                             "password": password,
                                             "username": username
                                         },
                                         "method": {
                                             "name": "getUnitsAvailabilityAndPricing",
                                             "params": {
                                                 "propertyId": property_id,
                                                 "availableUnitsOnly": credentials&.entrata_available_units_only,
                                                 "showUnitSpaces": credentials&.entrata_show_unit_spaces,
                                                 "useSpaceConfiguration": credentials&.entrata_use_space_configuration,
                                                 "moveInStartDate": move_in_date
                                             }
                                         }
                                     }.to_json,
                                     :headers => { 'Content-Type' => 'application/json' } )
            response =  JSON.parse(response.body)
          end
          sleep 5

          if response["response"]["code"] == 200
            unless response["response"]["result"].include?('No records found')
              psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
              psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]

              # psi_floorplan.each_with_index do |f,index|
              #   floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
              # end
              
              psi_units.each do |u|
                u['UnitSpace'].each do |us|

                  begin
                    if u['UnitSpace'].count == 1
                      unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                      unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                        unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)],community_id: credentials.community_id)
                      end
                    else
                      unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                      unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                        unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                      end
                    end
                    unless unit.present?
                      unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"],community_id: credentials.community_id)
                    end
                    unless unit.present? # for unit with have extra 'A' in unit number getavailabilityandpricing
                      unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                    end

                    unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                      unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 1)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                    end

                    unless unit.present? # filter by unitId + unitSpaceId
                      unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+(us[1]["@attributes"]["Id"].to_s),community_id: credentials.community_id)
                    end
                    
                    puts "**************"*20
                    puts "psi swap UnitsAvailabilityAndPricing of the Unit of ID #{unit.provider_unit_id}" 
                    puts "**************"*20

                    if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                      unit.availability = 'Unoccupied'
                      unit.available = true
                    else
                      unit.availability = 'Occupied'
                      unit.available = false
                    end

                    if us[1]["@attributes"]["AvailableOn"].present?
                      date = us[1]["@attributes"]["AvailableOn"]
                      dateSplit = date.split('/')
                      day = dateSplit[0]
                      month = dateSplit[1]
                      year = dateSplit[2]
                      unit.available_date = Date.parse("#{month}-#{day}-#{year}")
                    end

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

                    rentStr = ""
                    
                    begin
                      if us[1]["Rent"]["TermRent"].count > 1# && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                        us[1]["Rent"]["TermRent"].each do |tr|
                          spaceOption = tr["@attributes"]["SpaceOption"].present? ? tr["@attributes"]["SpaceOption"] : "" rescue ""
                          startDate = tr["@attributes"]["StartDate"].present? ? tr["@attributes"]["StartDate"] : "" rescue ""
                          endDate = tr["@attributes"]["EndDate"].present? ? tr["@attributes"]["EndDate"] : "" rescue ""
                          rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +":"+spaceOption+":"+startDate+":"+endDate+"\;"
                        end
                      end
                    rescue => rt_ex

                    end

                    unit.lease_pricing = rentStr
                    unit.save(validate: false)
                  rescue => ex
                  end
                end
              end
              #else
              #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
            else
              #################################### with unit space pricing
              begin
                if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
                  url = credentials.entrata_url
                else
                  url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
                end
                password = credentials.password
                username = credentials.username
                #property_id = credentials.property_id
                response = HTTParty.post(url,
                                         :body => {
                                             "auth": {
                                                 "type": "basic",
                                                 "password": password,
                                                 "username": username
                                             },
                                             "method": {
                                                 "name": "getUnitsAvailabilityAndPricing",
                                                 "params": {
                                                     "propertyId": property_id,
                                                     "availableUnitsOnly": credentials&.entrata_available_units_only,
                                                     "showUnitSpaces": credentials&.entrata_show_unit_spaces
                                                 }
                                             }
                                         }.to_json,
                                         :headers => { 'Content-Type' => 'application/json' } )
                response =  JSON.parse(response.body)
                sleep 5
                if response["response"]["code"] == 200
                  psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
                  psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
                  
                  # psi_floorplan.each_with_index do |f,index|
                  #   floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
                  # end

                  psi_units.each do |u|
                    u['UnitSpace'].each do |us|
                      begin
                        if u['UnitSpace'].count == 1
                          unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                            unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)],community_id: credentials.community_id)
                          end
                        else
                          unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                            unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          end
                        end
                        unless unit.present?
                          unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"],community_id: credentials.community_id)
                        end
                        unless unit.present? # for unit with have extra 'A' in unit number getavailabilityandpricing
                          unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                        end

                        unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                          unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 1)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                        end

                        unless unit.present? # filter by unitId + unitSpaceId
                          unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+(us[1]["@attributes"]["Id"].to_s),community_id: credentials.community_id)
                        end
                        
                        puts "**************"*20
                        puts "psi swap UnitsAvailabilityAndPricing of the Unit of ID #{unit.provider_unit_id}" 
                        puts "**************"*20

                        if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                          unit.availability = 'Unoccupied'
                          unit.available = true
                        else
                          unit.availability = 'Occupied'
                          unit.available = false
                        end

                        if us[1]["@attributes"]["AvailableOn"].present?
                          date = us[1]["@attributes"]["AvailableOn"]
                          dateSplit = date.split('/')
                          day = dateSplit[0]
                          month = dateSplit[1]
                          year = dateSplit[2]
                          unit.available_date = Date.parse("#{month}-#{day}-#{year}")
                        end
                        
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

                        rentStr = ""
                        begin
                          if us[1]["Rent"]["TermRent"].count > 1 #0 && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                            us[1]["Rent"]["TermRent"].each do |tr|
                              rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +"::\;"
                            end
                          end
                        rescue => rt_ex

                        end

                        unit.lease_pricing = rentStr
                        unit.save(validate: false)
                      rescue => ex
                      end
                    end
                  end
                  #else
                  #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
                end
              rescue => e
                begin
                  com = Community.find credentials.community_id
                  unless com.entrata_exception_logs.present?
                    com.entrata_exception_logs = ""
                  end
                  com.entrata_exception_logs = Time.now.to_s + com.entrata_exception_logs + "|||||||Pricing|||||||| " + com.id.to_s + "--- "+ e.message
                  com.save
                rescue => r
                end
                #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
              end

              ####################################
            end

          end
        rescue => e
          begin
            com = Community.find credentials.community_id
            unless com.entrata_exception_logs.present?
              com.entrata_exception_logs = ""
            end
            com.entrata_exception_logs = Time.now.to_s + com.entrata_exception_logs + "|||||||Pricing|||||||| " + com.id.to_s + "--- "+ e.message
            com.save
          rescue => r
          end
          #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
        end
      end

      ##########################################


    end
  end
  def getMoveInDate(property_id)
    url = get_move_in_dates_endpoint()
    password = credentials.password
    username = credentials.username
    #property_id = credentials.property_id
    begin
      response = HTTParty.post(url,
                               :body => {
                                   "auth": {
                                       "type": "basic",
                                       "password": password,
                                       "username": username
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
      response =  JSON.parse(response.body)
      moveIn_dates = []
      response['response']['result']['Property'][0]['leasePeriods']['leasePeriod'].each do |dates|
        if dates['leaseStartDate'].present?
          moveIn_dates << dates['leaseStartDate']
        end
      end
    rescue
    end
    moveIn_dates
  end

  def save_website_column_of_community(response)
    community = Community.find credentials.community_id
    community.update_attribute(:website,response['response']['result']["PhysicalProperty"]["Property"][0]["PropertyID"]["WebSite"])
  end
  def rename_provider
    Floorplan.where(community_id: credentials.community_id, provider: "psi").delete_all
    Floorplan.where(community_id: credentials.community_id, provider: "psi_new").update_all(provider: "psi")
    # fp = Floorplan.where(community_id: credentials.community_id)
    # fp.each do |d|
    #   unless d.provider == "psi_new"
    #     d.destroy
    #   end
    # end
    Unit.where(community_id: credentials.community_id, provider: "psi").delete_all
    Unit.where(community_id: credentials.community_id, provider: "psi_new").update_all(provider: "psi")
    # unit = Unit.where(community_id: credentials.community_id)
    # unit.each do |d|
    #   if d.provider == "psi_new"
    #     d.provider = "psi"
    #     d.save
    #   end
    # end

    # fp = Floorplan.where(community_id: credentials.community_id)
    # fp.each do |d|
    #   if d.provider == "psi_new"
    #     d.provider = "psi"
    #     d.save
    #   end
    # end
  end

  def get_move_in_dates_endpoint
    if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
      url = credentials.entrata_url
    else
      url = "https://#{credentials.entrata_url}.entrata.com/api/v1/properties"
    end

    url
  end

end