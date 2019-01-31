class PsiSwapService < BaseService
  @@floorplanHash = Hash.new
  def perform
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        @@floorplanHash = {}
        url = credentials.url
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
                                             "availableUnitsOnly": "0"
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
          end
      rescue => e
        puts '----------------------------' , e.message
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
    fill_psi_pricing_details
    rename_provider
  end

  def save_psi_units(units,property_id)
    units.each do |u|
      vacateDate = ""
      puts '+++++++++++++++++++++++++++ update outer  +++++++++++++++++++++++++++++'

      unit = Unit.where(community_id: credentials.community_id,marketing_name: u["Units"]["Unit"]["MarketingName"]).first
      if unit.present?
        puts '+++++++++++++++++++++++++++ update inner  +++++++++++++++++++++++++++++'
        unit.provider = "psi_new"
        unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"]
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        # unit.marketing_name = u["Units"]["Unit"]["MarketingName"].to_i
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
        elsif u["Units"]["Unit"]["UnitRent"].present?
          unit.effective_rent = u["Units"]["Unit"]["UnitRent"]
        else
          unit.effective_rent = 0
        end
        # unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
        unit.floor = u["FloorLevel"]
        unit.availability = u["Availability"]["VacancyClass"]
        if u["Availability"]["VacancyClass"] == "Unoccupied"
          year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
          month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
          day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        end
        unit.available_date = vacateDate
        building = u["Units"]["Unit"]["BuildingName"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.save(validate: false)
      else
        dup = Unit.find_by(community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"])
        if dup.present?
          dup.destroy
        end
        # unit = Unit.where(community_id: credentials.community_id).first
        unit = Unit.new
        unit.community_id = credentials.community_id
        unit.provider = "psi_new"
        unit.property_id = property_id
        unit.unit_type = u["Units"]["Unit"]["UnitType"]
        unit.marketing_name = u["Units"]["Unit"]["MarketingName"].to_i
        unit.provider_unit_id =  u["Units"]["Unit"]["Identification"]["IDValue"]
        unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
        # unit.effective_rent = 1.0 #Setting rent to avoid validation issues
        if u["Units"]["Unit"]["MarketRent"].present?
          unit.market_rent = u["Units"]["Unit"]["MarketRent"]
        end

        if u["EffectiveRent"].present?
          unit.effective_rent = u["EffectiveRent"]
        elsif u["Units"]["Unit"]["UnitRent"].present?
          unit.effective_rent = u["Units"]["Unit"]["UnitRent"]
        else
          unit.effective_rent = 0
        end
        if u["Units"]["Unit"]["MinSquareFeet"].present?
          if u["Units"]["Unit"]["MinSquareFeet"].to_f > 1
            unit.square_feet = u["Units"]["Unit"]["MinSquareFeet"].to_f
          else
            unit.square_feet = u["Units"]["Unit"]["MaxSquareFeet"].to_f
          end
        end
        # unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
        unit.floor = u["FloorLevel"]
        unit.availability = u["Availability"]["VacancyClass"]
        if u["Availability"]["VacancyClass"] == "Unoccupied"
          year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
          month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
          day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
          vacateDate = Date.parse("#{year}-#{month}-#{day}")
        end
        unit.available_date = vacateDate
        building = u["Units"]["Unit"]["BuildingName"]
        unit.building = building.present? ? building.gsub("Building ", "") : ""
        unit.save(validate: false)

      end
    end
    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      unless d.provider == "psi_new" || d.provider == "manually"
        d.destroy
      end
    end

  end

  def save_psi_floorplans(floorplans,property_id)
    puts '+++++++++++++++++++++++++ add new floor plans  outerrrrr +++++++++++++++++++++++++++++'
    floorplans.each do |f|

      puts '+++++++++++++++++++++++++ add new floor plans innerrrrr +++++++++++++++++++++++++++++'
      floorplan = Floorplan.where(community_id: credentials.community_id,name: f["Name"]).first
      if floorplan.present?
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
        dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"])
        if dup.present?
          dup.destroy
        end
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
        puts '++++++++++++++++++', floorplan.errors.full_messages.join(',')

      end
    end
    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      unless d.provider == "psi_new"
        d.destroy
      end
    end

  end

  def fill_psi_pricing_details
    floorplanHash = Hash.new
    property_ids = credentials.property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin
        url = credentials.url
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
              unit.availability = true
            else
              unit.availability = false
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
  def rename_provider
    unit = Unit.where(community_id: credentials.community_id)
    unit.each do |d|
      if d.provider == "psi_new"
        d.provider = "psi"
        d.save
      end
    end

    fp = Floorplan.where(community_id: credentials.community_id)
    fp.each do |d|
      if d.provider == "psi_new"
        d.provider = "psi"
        d.save
      end
    end
  end

end