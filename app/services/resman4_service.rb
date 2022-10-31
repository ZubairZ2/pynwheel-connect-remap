class Resman4Service < BaseService
  def perform
    @unit_record = []
    property_ids = credentials.resman_property_id.split(',') rescue []
    property_ids.each do |property_id|
      begin

        account_id = credentials.resman_account_id
        community = Community.find credentials.community_id

        #property_id = credentials.property_id
        url = "https://api.myresman.com/MITS/GetMarketing4_0"
        response = HTTParty.post(url,
                                 :body => {
                                     "ApiKey": '9412bd2716b648c1b00b62643e63850b',
                                     "IntegrationPartnerID": '1214',
                                     "AccountID": account_id,
                                     "PropertyID": property_id,
                                 },
                                 :headers => { 'Content-Type' => 'application/x-www-form-urlencoded' } )
        # response =  JSON.parse(response.body)
        if response["ResMan"]["Status"] == "Success"
          units = []
          floorplans = []
          response["ResMan"]["Response"]["PhysicalProperty"]["Property"]["ILS_Unit"].each do |pro|
            units << pro
          end

          response["ResMan"]["Response"]["PhysicalProperty"]["Property"]["Floorplan"].each do |pro|
            floorplans << pro
          end
          $units_availability_url = response["ResMan"]["Response"]["PhysicalProperty"]["Property"]["Information"]["UnitApplicationBaseURL"]
          save_resman_units(units,property_id)
          save_resman_floorplans(floorplans,property_id)
          community&.community_data_updated_on()
          # save_website_column_of_community(response)
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
          ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
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
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def save_resman_units(units,property_id)
    import_units = []

    unit_present =  Unit.where("community_id = ? AND provider IN (?)",  credentials.community_id,  ["resman"]).map{|x| x.provider_unit_id.gsub('*','-')}
    units.each do |u|
      vacateDate = ""
      unit = Unit.find_by(provider: "resman",community_id: credentials.community_id,provider_unit_id: u["IDValue"].gsub('*','-'))#.first_or_initialize

      if unit.present?

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
        
        @unit_record << unit.provider_unit_id.gsub('*','-')
        # unit.save(validate: false)
        import_units << unit

      else
        vacateDate = ""
        unit = Unit.where(provider: "resman",community_id: credentials.community_id,provider_unit_id: u["IDValue"].gsub('*','-')).first_or_initialize

        unless unit.manual_override
          unit.property_id = property_id
          unit.unit_type = u["Units"]["Unit"]["UnitType"]
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

    no_unit = unit_present - @unit_record
    import_units = []

    if @unit_record.nil?
      no_unit = nil
    end

    no_unit.each do |un|
      unit = Unit.find_by(community_id: credentials.community_id, provider_unit_id: un.gsub('*','-'))
      unit.availability = "Occupied"
      unit.available = false
      unit.available_date = nil
      import_units << unit unless unit.manual_override
      # unit.save(validate: false) unless unit.manual_override
    end

    ProvidersDataUpdationService.new().update_or_create_units_records(import_units)

  end

  def save_resman_floorplans(floorplans,property_id)
    import_floorplans = []

    floorplans.each do |f|
      floorplan = Floorplan.find_by(provider: "resman",community_id: credentials.community_id,provider_floorplan_id: f["IDValue"])#.first_or_initialize
      if floorplan.present?
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
        floorplan = Floorplan.where(provider: "resman",community_id: credentials.community_id,provider_floorplan_id: f["IDValue"]).first_or_initialize
        floorplan.property_id = property_id
        unless floorplan.name_is_updated.present? && floorplan.name_is_updated
          floorplan.name = f["Name"]
        end

        floorplan.unit_count = f["UnitCount"]
        floorplan.units_available = f["UnitsAvailable"]
        floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["Exact"]
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

end