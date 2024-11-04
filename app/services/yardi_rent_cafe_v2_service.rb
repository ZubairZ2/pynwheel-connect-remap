class YardiRentCafeV2Service < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
    @unit_record = []
    @all_units_hash = ProvidersDataUpdationService.new().get_all_units_hash(@credentials.community_id, "yardirentcafe")
    @all_floorplans_hash = ProvidersDataUpdationService.new().get_all_floorplans_hash(@credentials.community_id, "yardirentcafe")
  end

  def perform
    before_updation_units = NotifyManagerService.new(@credentials.community_id)
    import_yardirentcafe_floorplans
    import_yardirentcafe_units
    before_updation_units.compare_status_and_notify()
  end

  private

    def import_yardirentcafe_units
      return unless @all_units_hash.present?
      property_codes = @credentials.p_code.split(',') rescue []
      property_codes.each do |property_code|
        begin
          import_units = []
          response = get_appartments_availability(property_code)
          unit_present = @all_units_hash.keys

          if response.present?
            community = Community.find @credentials.community_id
            community&.community_data_updated_on()

            response.each do |r|
              begin
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
                  
                  leasing = ""
                  lease_prices_array = []

                  if unit.available
                    rentStrs = yardi_rent_cafe_rent_matrix(property_code, r["apartmentName"], available_date_convertor(r["availableDate"]))
                    
                    if rentStrs.present?
                      rentStrs.each do |rentStr|
                        if rentStr[0].to_i > 0
                          lease_prices_array << rentStr[0].to_i
                          leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                        end
                      end

                      min_term_rent = lease_prices_array&.min
                      max_term_rent = lease_prices_array&.max

                      if min_term_rent.present?
                        unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                          unit.effective_rent = min_term_rent
                          unit.market_rent = min_term_rent
                        end
                      end
              
                      unit.min_effective_rent = min_term_rent if min_term_rent.present?
                      unit.max_effective_rent = max_term_rent if max_term_rent.present?
                      
                    end
                  end

                  unit.lease_pricing = leasing
                  
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
                    leasing = ""
                    lease_prices_array = []

                    if  unit.available
                      rentStrs = yardi_rent_cafe_rent_matrix(property_code, r["apartmentName"], available_date_convertor(r["availableDate"]))
                      if rentStrs.present?
                        rentStrs.each do |rentStr|
                          if rentStr[0].to_i > 0
                            lease_prices_array << rentStr[0].to_i
                            leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                          end
                        end

                        min_term_rent = lease_prices_array&.min
                        max_term_rent = lease_prices_array&.max

                        if min_term_rent.present?
                          unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                            unit.effective_rent = min_term_rent
                            unit.market_rent = min_term_rent
                          end
                        end
                
                        unit.min_effective_rent = min_term_rent if min_term_rent.present?
                        unit.max_effective_rent = max_term_rent if max_term_rent.present?

                      end
                    end

                    unit.lease_pricing = leasing

                    import_units << unit

                  end
                end

              rescue => e
                raise e
              end
            end

            ProvidersDataUpdationService.new().update_or_create_units_records(import_units)

            begin
              cred = Credential.find @credentials.id
              cred.data_error_message = nil
              PaperTrail.enabled = false
              cred.save
              PaperTrail.enabled = true
            rescue => err
              raise err
            end

          else
            begin
              cred = Credential.find @credentials.id
              cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
              PaperTrail.enabled = false
              cred.save
              PaperTrail.enabled = true
            rescue => err
              raise err
            end
          end

          ProvidersDataUpdationService.new().update_availability_of_units(@credentials.community_id, (unit_present - @unit_record))
          
        rescue => e
          raise e
          begin
            cred = Credential.find @credentials.id
            cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
            PaperTrail.enabled = false
            cred.save
            PaperTrail.enabled = true
          rescue => err
            raise err
          end
        end
      end
    end

    def import_yardirentcafe_floorplans
      return unless @all_floorplans_hash.present?

      property_codes = @credentials.p_code.split(',') rescue []
      property_codes.each do |property_code|
        begin

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
        rescue => e
          raise e
        end
      end
    end


    def set_availabilty_date(available_date)
      available_date = available_date.split("/")
      "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
    end
    
    def available_date_convertor(available_date)
      today_date = Date.today.strftime("%Y-%m-%d")
    
      if available_date.present?
        parsed_today_date = Date.parse(today_date)
        parsed_available_date = Date.parse(set_availabilty_date(available_date))
    
        if parsed_available_date > parsed_today_date
          parsed_available_date.strftime("%Y-%m-%d")
        else
          today_date
        end
      else
        today_date
      end
    end    

    def yardi_rent_cafe_rent_matrix(property_code, apartment_name, available_date)
      begin
        rent_matrix = get_apartment_pricing_details(property_code, apartment_name, available_date)
        if rent_matrix.present?
          uniq_terms = rent_matrix.map{|x| x["term"].to_i }.uniq
          distinct_data = uniq_terms.map{|term| rent_matrix.map{|data| data if data["term"] == term.to_s}.compact}.compact
          
          return distinct_data.map{|data| data.map{|r| [r["rent"].to_i, r["term"], r["start_Date"], r["end_Date"]]}.min}
        else
          return nil
        end

      rescue => ex
        raise ex
      end
    end

    def get_appartments_availability property_code
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_apartment_availability(property_code)
    end

    def get_apartment_pricing_details property_code, apartment_name, available_date
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_apartment_pricing_matrix(apartment_name, property_code, available_date)
    end

    def get_floorplan_details property_code
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_floorplans(property_code)
    end
end