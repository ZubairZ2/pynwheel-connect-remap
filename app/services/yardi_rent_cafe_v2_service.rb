class YardiRentCafeV2Service < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
    @unit_record = []
    @all_units_hash = ProvidersDataUpdationService.new().get_all_units_hash(@credentials.community_id, "yardirentcafe")
    @all_floorplans_hash = ProvidersDataUpdationService.new().get_all_floorplans_hash(@credentials.community_id, "yardirentcafe")
  end

  def perform
    begin
      before_updation_units = NotifyManagerService.new(@credentials.community_id)

      property_codes = @credentials.p_code.split(',') rescue []
      
      property_codes.each do |property_code|
        import_yardirentcafe_floorplans(property_code)
        import_yardirentcafe_units(property_code)
        yardi_rent_cafe_rent_matrix(property_code)
      end

      before_updation_units.compare_status_and_notify()
    rescue => exception
      raise exception
    end
  end

  private

    def import_yardirentcafe_units property_code
      return unless @all_units_hash.present?
      import_units = []
      response = get_appartments_availability(property_code)
      unit_present = @all_units_hash.keys

      if response.present?
        community = Community.find @credentials.community_id
        community&.community_data_updated_on()
        
        response.each do |r|
          unit = @all_units_hash[r["apartmentId"].to_s]

          if unit.present?
            unit.market_rent = r["minimumRent"]
            
            unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
              unit.effective_rent = r["minimumRent"]
            end
            
            unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
              unit.availability = "Unoccupied" if !unit.sold
            end
            
            if ( r["availableDate"] != "" && r["availableDate"] != nil )
              unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                unit.availability = "Unoccupied" if !unit.sold
              end

              unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
                unit.available_date = Date.parse(set_availabilty_date(r["availableDate"]))
              end

            else
              unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                unit.availability = "Occupied"
              end

              unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
                unit.available_date = ""
              end

            end

            unless unit.available_is_updated.present? && unit.available_is_updated && unit.manual_override
              if unit.availability == "Unoccupied"
                unit.available = true if !unit.sold
              else
                unit.available = false
              end
            end

            if unit.effective_rent <= 0
              unit.effective_rent = 1.0
            end

            @unit_record << unit.provider_unit_id
            unit.square_feet = r["sqft"] if r["sqft"].present?
            unit.min_effective_rent = r["minimumRent"] if r["minimumRent"].present?
            unit.max_effective_rent = r["maximumRent"] if r["maximumRent"].present?
            unit.availability_url = r["applyOnlineURL"] if r["applyOnlineURL"].present?
            unit.unit_status = r["unitStatus"] rescue ""
            import_units << unit

          else
            unit = Unit.where(provider: "yardirentcafe", community_id: @credentials.community_id, provider_unit_id: r["apartmentId"]).first_or_initialize
            
            unless unit.manual_override
              unit.property_id = r["propertyId"]
              unit.unit_type = r["apartmentName"]
              unless unit.name_is_updated.present? && unit.name_is_updated
                unit.marketing_name = r["apartmentName"]
              end
              unless unit.floor_is_updated.present? && unit.floor_is_updated
                unit.floor = evaluate_floor(unit.marketing_name) rescue nil
              end
              unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
                unit.floorplan_id = r["floorplanId"]
              end

              unit.market_rent = r["minimumRent"]
              unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
                unit.effective_rent = r["minimumRent"]
              end

              unless unit.availability_is_updated.present? && unit.availability_is_updated
                unit.availability = "Unoccupied"
              end

              if ( r["availableDate"] != "" && r["availableDate"] != nil )
                unless unit.availability_is_updated.present? && unit.availability_is_updated
                  unit.availability = "Unoccupied"
                end

                unless unit.available_date_is_updated.present? && unit.available_date_is_updated
                  unit.available_date = Date.parse(set_availabilty_date(r["availableDate"]))
                end

              else
                unless unit.availability_is_updated.present? && unit.availability_is_updated
                  unit.availability = "Occupied"
                end

                unless unit.available_date_is_updated.present? && unit.available_date_is_updated
                  unit.available_date = ""
                end

              end

              unless unit.available_is_updated.present? && unit.available_is_updated
                if unit.availability == "Occupied"
                  unit.available = false
                else
                  unit.available = true
                end
              end
              
              unit.unit_status = r["unitStatus"] rescue ""
              unit.min_effective_rent = r["minimumRent"] if r["minimumRent"].present?
              unit.max_effective_rent = r["maximumRent"] if r["maximumRent"].present?
              
              if unit.effective_rent <= 0
                unit.effective_rent = 1.0
              end

              unit.manually_updated = false
              unit.availability_url = r["applyOnlineURL"] if r["applyOnlineURL"].present?
              import_units << unit
            end
          end
        end

        ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
      end

      ProvidersDataUpdationService.new().update_availability_of_units(@credentials.community_id, (unit_present - @unit_record))
    end

    def import_yardirentcafe_floorplans property_code
      return unless @all_floorplans_hash.present?
      import_floorplans = []
      response = get_floorplan_details(property_code)

      if response.present?
        response.each do |r|
          fp = @all_floorplans_hash[r["floorplanId"].to_s]
          
          if fp.present?
            unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated && fp.manual_override
              fp.market_rent = r["minimumRent"]
            end

            import_floorplans << fp
          else
            fp = Floorplan.where(provider: "yardirentcafe", community_id: @credentials.community_id, provider_floorplan_id: r["floorplanId"]).first_or_initialize

            unless fp.manual_override
              fp.property_id = r["propertyId"]
              fp.provider_floorplan_id = r["floorplanId"]

              unless fp.name_is_updated.present? && fp.name_is_updated
                fp.name = r["floorplanName"]
              end

              fp.unit_count = r[""]
              fp.units_available = r[""]

              unless fp.bedroom_is_updated.present? && fp.bedroom_is_updated
                fp.bedrooms = r["beds"]
              end

              unless fp.bathroom_is_updated.present? && fp.bathroom_is_updated
                fp.bathrooms = r["baths"]
              end

              unless fp.square_feet_is_updated.present? && fp.square_feet_is_updated
                if r["minimumSQFT"].present?
                  fp.square_feet = r["minimumSQFT"]
                elsif r["sqft"].present?
                  fp.square_feet = r["sqft"]
                end
              end

              unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated
                fp.market_rent = r["minimumRent"]
              end

              fp.deposit = r["minimumDeposit"]

              import_floorplans << fp
            end
          end
        end

        ProvidersDataUpdationService.new().update_or_create_floorplans_records(import_floorplans)
      end
    end

    def set_availabilty_date(available_date)
      available_date = available_date.split("/")
      "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
    end

    def yardi_rent_cafe_rent_matrix(property_code)
      rent_matrix = get_apartment_pricing_details(property_code)
      if rent_matrix.present?
        uniq_units = rent_matrix.map{|x| x["apartmentId"].to_i }&.compact&.uniq
        uniq_units.each do |apartment_id|
          unit = Unit.find_by(provider: "yardirentcafe", community_id: @credentials.community_id, provider_unit_id: apartment_id)

          if unit.present?
            apartment_pricing = rent_matrix.map{|data| data if data["apartmentId"] == apartment_id}.compact

            uniq_terms = rent_matrix.map{|x| x["term"].to_i }.uniq
            distinct_data = uniq_terms.map{|term| apartment_pricing.map{|data| data if data["term"] == term.to_s}.compact}.compact
            rentStrs = distinct_data.map{|data| data.map{|r| [r["rent"].to_i, r["term"], r["start_Date"], r["end_Date"]]}.min}
            calculate_lease_pricing(unit, rentStrs.compact)
          end
        end
      end
    end

    def calculate_lease_pricing(unit, rentStrs)
      leasing = ""
      lease_prices_array = []

      if rentStrs.present?
        rentStrs.each do |rentStr|
          if rentStr[0].to_i > 0
            lease_prices_array << rentStr[0].to_i
            leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" + rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
          end
        end
      end

      min_term_rent = lease_prices_array&.min
      max_term_rent = lease_prices_array&.max
      
      unit.effective_rent = min_term_rent if min_term_rent.present?
      unit.market_rent = min_term_rent if min_term_rent.present?
      unit.min_effective_rent = min_term_rent if min_term_rent.present?
      unit.max_effective_rent = max_term_rent if max_term_rent.present?
      unit.lease_pricing = leasing
      unit.save(validate: false)
    end

    def get_appartments_availability property_code
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_apartment_availability(property_code)
    end

    def get_apartment_pricing_details property_code
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_apartment_pricing_matrix(property_code)
    end

    def get_floorplan_details property_code
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_floorplans(property_code)
    end
end