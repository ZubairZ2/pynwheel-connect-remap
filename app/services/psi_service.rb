class PsiService < BaseService
  # @@floorplanHash = Hash.new
  def perform
    begin
      fun_logs = Hash.new
      fun_logs = {Time.now => credentials.community_id.to_s}
      current_user = User.find 10
      unless current_user.entrata_function_logs.present?
        current_user.entrata_function_logs = ""
      end
      current_user.entrata_function_logs = current_user.entrata_function_logs + fun_logs.to_s
      current_user.save
      if credentials.community_id == 669
        c = Community.find credentials.community_id
        c.description = "Entrata hourly data test"
        c.save(validate: false)
      end
    rescue => m

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
          save_psi_floorplans(floorplans,property_id)
          save_psi_units(units,property_id)
          save_website_column_of_community(response)
          #else
          #puts '-----------------------------' , response["response"]["error"]["message"]
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        begin
          com = Community.find credentials.community_id
          unless com.entrata_exception_logs.present?
            com.entrata_exception_logs = ""
          end
          com.entrata_exception_logs = Time.now.to_s + com.entrata_exception_logs + "|||||||MITS|||||||| " + com.id.to_s + "--- "+ e.message
          com.save
        rescue => p
        end
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
    fill_psi_pricing_details
  end

  def save_psi_units(units,property_id)
    units.each do |u|
      vacateDate = ""

      unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"])#.first_or_initialize
      unless unit.present?
        unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"])#.first_or_initialize
      end

      if unit.present?
        unless unit.manual_override
          # unit.property_id = property_id
          # unit.unit_type = u["Units"]["Unit"]["UnitType"]
          # unit.marketing_name = u["Units"]["Unit"]["MarketingName"].to_i
          #
          # unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
          if u["Units"]["Unit"]["MarketRent"].present?
            unit.market_rent = u["Units"]["Unit"]["MarketRent"]
          end
          if u["Units"]["Unit"]["MarketRent"].present?
            unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
          elsif u["EffectiveRent"].present?
            unit.effective_rent = u["EffectiveRent"]
          # else
          #   unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
          end
          # unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
          # if u["EffectiveRent"].present?
          #   unit.effective_rent = u["EffectiveRent"]
          # else
          #   unit.effective_rent = 0
          # end
          # unit.floor = u["FloorLevel"]
          unit.availability = u["Availability"]["VacancyClass"]
          unit.available = false
          if u["Availability"]["VacancyClass"] == "Unoccupied"
            unit.available = true
            year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
            month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
            day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
            vacateDate = Date.parse("#{year}-#{month}-#{day}")
          end
          unit.available_date = vacateDate
          # building = u["Units"]["Unit"]["BuildingName"]
          # unit.building = building.present? ? building.gsub("Building ", "") : ""
          unit.save(validate: false)
        end
      end
    end
  end

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.find_by(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"])#.first_or_initialize
      if floorplan.present?
        unless floorplan.manual_override
          # floorplan.property_id = property_id
          # floorplan.name = f["Name"]
          # floorplan.unit_count = f["UnitsAvailable"]
          # floorplan.units_available = f["DisplayedUnitsAvailable"]
          # floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
          # floorplan.availability_url = f["FloorplanAvailabilityURL"]

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
          floorplan.save
        end
      end
    end
  end

  def fill_psi_pricing_details
    floorplanHash = Hash.new
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
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
                  unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
                elsif floorplanHash[u["@attributes"]["FloorPlanName"]] > 0.0
                  unit.effective_rent = floorplanHash[u["@attributes"]["FloorPlanName"]]
                else
                  unit.effective_rent = 0.0
                end
                rentStr = ""
                if us[1]["Rent"]["TermRent"].count > 1
                  us[1]["Rent"]["TermRent"].each do |tr|
                    rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +"::;"
                  end
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
          com.save
        rescue => r
        end
        puts '-------------- filling pricing --------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def save_website_column_of_community(response)
    community = Community.find credentials.community_id
    community.update_attribute(:website,response['response']['result']["PhysicalProperty"]["Property"][0]["PropertyID"]["WebSite"])
  end


end