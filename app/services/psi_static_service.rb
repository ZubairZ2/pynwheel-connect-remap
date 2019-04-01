class PsiStaticService < BaseService
  @@floorplanHash = Hash.new
  def perform
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        @@floorplanHash = {}
        url = "https://"+credentials.entrata_url+".entrata.com/api/v1/propertyunits"
        password = credentials.password
        username = credentials.username
        unitPricingHash = Hash.new
        #property_id = credentials.property_id
        begin
          response2 = HTTParty.post(url,
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
                                               "availableUnitsOnly": "0"
                                           }
                                       }
                                   }.to_json,
                                   :headers => { 'Content-Type' => 'application/json' } )
          response2 =  JSON.parse(response2.body)
          if response2["response"]["code"] == 200
            response2['response']['result']["PhysicalProperty"]["Property"][0]["ILS_Unit"].each do |ils|
              if ils["Units"]["Unit"]["MarketRent"].present?
                unitPricingHash[ils["Units"]["Unit"]["Identification"]["IDValue"].to_s] = ils["Units"]["Unit"]["MarketRent"]
              end
            end
          end
        end
        ########
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
          save_psi_units(units,property_id,unitPricingHash)
          save_website_column_of_community(response)
          #else
          #puts '-----------------------------' , response["response"]["error"]["message"]
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
    # fill_psi_pricing_details
  end

  def save_psi_units(units,property_id,unitPricingHash)
    units.each do |u|
      vacateDate = ""

      unit = Unit.where(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"]).first_or_initialize

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
      if u["Units"]["Unit"]["MarketRent"].present?
        unit.market_rent = u["Units"]["Unit"]["MarketRent"]
      end
      if u["EffectiveRent"].present?
        unit.effective_rent = u["EffectiveRent"]
      elsif unitPricingHash[u["Units"]["Unit"]["Identification"]["IDValue"].to_s].present?
        unit.effective_rent = unitPricingHash[u["Units"]["Unit"]["Identification"]["IDValue"].to_s]
      else
        unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
      end

      # unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
      unit.floor = u["FloorLevel"]
      unit.availability_url = u["Availability"]["UnitAvailabilityURL"]
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
      building = u["Units"]["Unit"]["BuildingName"]
      unit.building = building.present? ? building.gsub("Building ", "") : ""
      unit.manually_updated = false
      unit.save(validate: false)

    end
  end

  def save_psi_floorplans(floorplans,property_id)
    floorplans.each do |f|
      floorplan = Floorplan.where(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"]).first_or_initialize

      floorplan.property_id = property_id
      floorplan.name = f["Name"]

      if f["MarketRent"]["@attributes"]["Min"].to_f > 0
        @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Min"]
      else
        @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Max"]
      end
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

        floorplan.market_rent = f["MarketRent"]["@attributes"]["Min"]
      else

        floorplan.market_rent = f["MarketRent"]["@attributes"]["Max"]
      end
      floorplan.save(validate: false)

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
                                             "availableUnitsOnly": "0"
                                         }
                                     }
                                 }.to_json,
                                 :headers => { 'Content-Type' => 'application/json' } )
        response =  JSON.parse(response.body)

        if response["response"]["code"] == 200
          psi_units = response["response"]["result"]["ILS_Units"]["Unit"]
          psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
          psi_floorplan.each_with_index do |f,index|
            floorplanHash[psi_floorplan[index]["Name"]] = psi_floorplan[index]["MarketRent"]["@attributes"]["Min"]
          end
          psi_units.each do |u|
            unit = Unit.find_by(provider_unit_id: u[1]["@attributes"]["PropertyUnitId"],community_id: credentials.community_id)
            pricing = u[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")


            if u[1]["@attributes"]["Availability"] == "Available"
              begin
                date = u[1]["@attributes"]["AvailableOn"]
                dateSplit = date.split('/')
                day = dateSplit[0]
                month = dateSplit[1]
                year = dateSplit[2]
                unit.available_date = Date.parse("#{month}-#{day}-#{year}")
              end
              unit.availability = 'Unoccupied'
              unit.available = true
              unit.save
            else
              unit.availability = 'Occupied'
              unit.available_date = ""
              unit.save
            end
            
            if pricing.to_f > 0
              unit.effective_rent = pricing.to_f
              unit.save(validate: false)
              # u[1]['Rent']['TermRent'].each do |a|
              #   if a["@attributes"]["IsBestPrice"] == "true"
              #     unit = Unit.find_by(provider_unit_id: u[1]["@attributes"]["PropertyUnitId"],community_id: credentials.community_id)
              #     if unit.present?
              #       lease_term = a["@attributes"]["LeaseTerm"].split(" ")
              #       # unit.effective_rent = a["@attributes"]["Rent"].remove(',').to_f
              #       unit.lease_term = lease_term[0]
              #       unit.save(validate: false)
              #     end
              #   end
              # end
            elsif unit.effective_rent <= 1
              pricing = floorplanHash[u[1]["@attributes"]["FloorPlanName"]].to_s.gsub(/[\s,]/ ,"")
              unit.effective_rent = pricing.to_f

              unit.save(validate: false)
            end
          end
          #else
          #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
        end
      rescue => e
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def save_website_column_of_community(response)
    community = Community.find credentials.community_id
    community.update_attribute(:website,response['response']['result']["PhysicalProperty"]["Property"][0]["PropertyID"]["WebSite"])
  end


end