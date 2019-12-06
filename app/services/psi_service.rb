class PsiService < BaseService
  # @@floorplanHash = Hash.new
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
        # @@floorplanHash = {}
        if credentials.entrata_url.include?('https://') || credentials.entrata_url.include?('http://')
          url = credentials.entrata_url
        else
          url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        end
        # if com_test.id == 458
        #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "2 "
        #   com_test.save
        # end

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
              "name": "getMitsPropertyUnits",
              "params": {
                "propertyIds": property_id,
                "availableUnitsOnly": "0",
                "showUnitSpaces": "1"
              }
            }
          }.to_json,
          :headers => { 'Content-Type' => 'application/json' } )
        response =  JSON.parse(response.body)
        # if com_test.id == 458
        #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "3 "
        #   com_test.save
        # end
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
          # if com_test.id == 458
          #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "4 "
          #   com_test.save
          # end
          save_psi_floorplans(floorplans,property_id)
          # if com_test.id == 458 || com_test.id == 819
          #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "5 "
          #   com_test.save
          # end
          save_psi_units(units,property_id)
          # if com_test.id == 458 || com_test.id == 819
          #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "6 "
          #   com_test.save
          # end
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = nil
            PaperTrail.enabled = false
            cred.save
            PaperTrail.enabled = true
          rescue => err
          end
          # save_website_column_of_community(response)
          #else
          #puts '-----------------------------' , response["response"]["error"]["message"]
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
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
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
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
    # if com_test.id == 458
    #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "7 "
    #   com_test.save
    # end
    fill_psi_pricing_details(1)
    fill_psi_pricing_details(0)
  end

  def save_psi_units(units,property_id)
    # units_in_feed = units.map{|x| x["Units"]["Unit"]["UnitType"]}
    # units_in_feed2 = units.map{|x| x["Units"]["Unit"]["UnitType"] + "-" + x["Units"]["Unit"]["MarketingName"]}
    # units_in_feed = units_in_feed + units_in_feed2

    unit_present =  Unit.where("community_id = ? AND provider IN (?)", credentials.community_id,  ["psi"]).map{|x| x.provider_unit_id}
    units.each do |u|
      vacateDate = ""

      unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"])#.first_or_initialize
      unless unit.present?
        unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"])#.first_or_initialize
      end

      if unit.present?
        # unit.property_id = property_id
        # unit.unit_type = u["Units"]["Unit"]["UnitType"]
        # unit.marketing_name = u["Units"]["Unit"]["MarketingName"].to_i
        #
        # unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
        if u["Units"]["Unit"]["MarketRent"].present?
          unit.market_rent = u["Units"]["Unit"]["MarketRent"]
        end
        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
          if u["Units"]["Unit"]["MarketRent"].present?
            unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
          elsif u["EffectiveRent"].present?
            unit.effective_rent = u["EffectiveRent"]
          # else
          #   unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
          end
        end

        # unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
        # if u["EffectiveRent"].present?
        #   unit.effective_rent = u["EffectiveRent"]
        # else
        #   unit.effective_rent = 0
        # end
        # unit.floor = u["FloorLevel"]
        unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
          unit.availability = u["Availability"]["VacancyClass"] if !unit.sold
          unit.available = false if !unit.sold
        end

        if u["Availability"]["VacancyClass"] == "Unoccupied"
          unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
            unit.available = true if !unit.sold
          end
          year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
          month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
          day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        end
        unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
          unit.available_date = vacateDate
        end
        unit.availability_url = u['Availability']['UnitAvailabilityURL'] if u['Availability'].present?
        # building = u["Units"]["Unit"]["BuildingName"]
        # unit.building = building.present? ? building.gsub("Building ", "") : ""
        @unit_record << unit.provider_unit_id
        unit.save(validate: false)
      end
    end

    no_unit = unit_present - @unit_record
    if @unit_record.nil?
      no_unit = nil
    end
    no_unit.each do |un|
      unit = Unit.find_by(community_id: credentials.community_id, provider_unit_id: un)
      unit.availability = "Occupied"
      unit.available = false
      unit.available_date = nil
      unit.save(validate: false) unless unit.manual_override
    end
  end

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.find_by(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"])#.first_or_initialize
      if floorplan.present?
        # floorplan.property_id = property_id
        # floorplan.name = f["Name"]
        # floorplan.unit_count = f["UnitsAvailable"]
        # floorplan.units_available = f["DisplayedUnitsAvailable"]
        # floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
        floorplan.availability_url = f["FloorplanAvailabilityURL"] if f["FloorplanAvailabilityURL"].present?


          # room_types = f["Room"]
          # room_types.each do |rt|
          #   if rt["@attributes"]["RoomType"] == "Bedroom"
          #     floorplan.bedrooms = rt["Count"]
          #   else
          #     floorplan.bathrooms = rt["Count"]
          #   end
          # end
          #
          # if f["SquareFeet"]["@attributes"]["Min"].to_f > 0
          #
          #   floorplan.square_feet = f["SquareFeet"]["@attributes"]["Min"]
          # else
          #
          #
          #   floorplan.square_feet = f["SquareFeet"]["@attributes"]["Max"]
          # end
          # if f["MarketRent"]["@attributes"]["Min"].to_f > 0
          #   @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Min"]
          # else
          #   @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Max"]
          # end
          if f["MarketRent"]["@attributes"]["Min"].to_f > 0

            floorplan.market_rent = f["MarketRent"]["@attributes"]["Min"]
          else

            floorplan.market_rent = f["MarketRent"]["@attributes"]["Max"]
          end
        end

        floorplan.save(validate: false)

      end
    end


  def fill_psi_pricing_details(hit)
    floorplanHash = Hash.new
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      move_in_dates = getMoveInDate(property_id)
      if hit == 1
        move_in_dates = []
        move_in_dates << "0"
      end
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
                                                 "availableUnitsOnly": "0",
                                                 "showUnitSpaces": "1",
                                                 "useSpaceConfiguration": "1"
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
                                                 "availableUnitsOnly": "0",
                                                 "showUnitSpaces": "1",
                                                 "useSpaceConfiguration": "1",
                                                 "moveInStartDate": move_in_date
                                             }
                                         }
                                     }.to_json,
                                     :headers => { 'Content-Type' => 'application/json' } )

            sleep 1
            response =  JSON.parse(response.body)
            sleep 2
          end

          if response["response"]["code"] == 200
            unless response["response"]["result"].include?('No records found')
              psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
              psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
              psi_floorplan.each_with_index do |f,index|
                floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
              end
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
                        unit.max_effective_rent = (us[1]["Rent"]["@attributes"]['MaxRent'].gsub(/[\s,]/ ,"")).to_f
                        unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
                      elsif floorplanHash[u["@attributes"]["FloorPlanName"]] > 0.0
                        unit.effective_rent = floorplanHash[u["@attributes"]["FloorPlanName"]]
                      else
                        unit.effective_rent = 0.0
                      end

                    end
                    rentStr = ""
                    begin
                      if us[1]["Rent"]["TermRent"].count > 1# && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                        us[1]["Rent"]["TermRent"].each do |tr|
                          spaceOption = tr["@attributes"]["SpaceOption"].present? ? tr["@attributes"]["SpaceOption"] : "" rescue ""
                          startDate = tr["@attributes"]["StartDate"].present? ? tr["@attributes"]["StartDate"] : "" rescue ""
                          endDate = tr["@attributes"]["EndDate"].present? ? tr["@attributes"]["EndDate"] : "" rescue ""
                          rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +":"+spaceOption+":"+startDate+":"+endDate+";"
                        end
                      end
                    rescue => rt_ex

                    end

                    unit.lease_pricing = rentStr
                    unit.save(validate: false)
                  rescue => ex
                    puts "---------------- Space configuration inside loop", ex.message
                  end
                end
              end
              puts "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"* 300
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
                                                     "availableUnitsOnly": "0",
                                                     "showUnitSpaces": "1"
                                                 }
                                             }
                                         }.to_json,
                                         :headers => { 'Content-Type' => 'application/json' } )
                response =  JSON.parse(response.body)
                sleep 2
                if response["response"]["code"] == 200
                  psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
                  psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
                  psi_floorplan.each_with_index do |f,index|
                    floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
                  end
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
                            unit.max_effective_rent = (us[1]["Rent"]["@attributes"]['MaxRent'].gsub(/[\s,]/ ,"")).to_f
                            unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
                          elsif floorplanHash[u["@attributes"]["FloorPlanName"]] > 0.0
                            unit.effective_rent = floorplanHash[u["@attributes"]["FloorPlanName"]]
                          else
                            unit.effective_rent = 0.0
                          end

                        end
                        rentStr = ""
                        begin
                          if us[1]["Rent"]["TermRent"].count > 1 #0 && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                            us[1]["Rent"]["TermRent"].each do |tr|
                              rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +"::;"
                            end
                          end
                        rescue => rt_ex

                        end

                        unit.lease_pricing = rentStr
                        unit.save(validate: false)
                      rescue => ex
                        puts "---------------- filling pricing inside loop", ex.message
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
                  PaperTrail.enabled = false
                  com.save
                  PaperTrail.enabled = true
                rescue => r
                end
                puts '-------------- filling pricing --------------' , e.message
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
            PaperTrail.enabled = false
            com.save
            PaperTrail.enabled = true
          rescue => r
          end
          puts '-------------- filling pricing --------------' , e.message
          #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
        end
      end

      ##########################################


    end
  end
  def getMoveInDate(property_id)
    url = "https://"+credentials.entrata_url+".entrata.com/api/v1/properties"
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
          ss = dates['leaseStartDate'].split('/')
          date1 = ss[2] + "-" +ss[0] + "-" + ss[1]
          date1 = (date1.to_date + 31).to_s
          ss = date1.split('-')
          added_date = ss[1] + "/" + ss[2] + "/" + ss[0]
          moveIn_dates << added_date
        end
      end
    rescue
    end
    moveIn_dates
  end

  def save_website_column_of_community(response)
    community = Community.find credentials.community_id
    # community.update_attribute(:website,response['response']['result']["PhysicalProperty"]["Property"][0]["PropertyID"]["WebSite"])
  end


end