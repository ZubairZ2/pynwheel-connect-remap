class YardiRentCafeService < BaseService
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

  def import_yardirentcafe_units
    return unless @all_units_hash.present?
    property_codes = @credentials.p_code.split(',') rescue []
    property_codes.each do |property_code|
      begin
        request_type = "apartmentavailability"
        company_code = @credentials.c_code
        api_token = @credentials.api_token
        showallunit =  @credentials.limit_result ? "0" : "-1"
        import_units = []

        if api_token.present?
          @url = "#{@credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=#{showallunit}"
        else
          @url = "#{@credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=#{showallunit}"
        end

        response = HTTParty.get(@url)
        response = JSON.parse(response.body)
        
        unit_present = @all_units_hash.keys

        if response[0]["Error"].nil?

          community = Community.find @credentials.community_id
          community&.community_data_updated_on()
          response.each do |r|
            # puts "-------------------------------------------------------- #{r["ApartmentId"].to_s} --------------------------------\n"
            begin
              unit = @all_units_hash[r["ApartmentId"].to_s]

              if unit.present?
                # puts "----------------------------- #{unit.marketing_name} ------------------------\n"
                unit.market_rent = r["MinimumRent"]
                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                  unit.effective_rent = r["MinimumRent"]
                end
                
                unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                  unit.availability = "Unoccupied" if !unit.sold
                end
                
                if ( r["AvailableDate"] != "" && r["AvailableDate"] != nil )
                  unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                    unit.availability = "Unoccupied" if !unit.sold
                  end

                  unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
                    unit.available_date = Date.parse(set_availabilty_date(r["AvailableDate"]))
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
                unit.square_feet = r["SQFT"] if r["SQFT"].present?
                unit.min_effective_rent = r["MinimumRent"] if r["MinimumRent"].present?
                unit.max_effective_rent = r["MaximumRent"] if r["MaximumRent"].present?
                unit.availability_url = r["ApplyOnlineURL"] if r["ApplyOnlineURL"].present?
                unit.unit_status = r["UnitStatus"] rescue ""

                leasing = ""
                lease_prices_array = []

                if unit.available
                  rentStrs = yardi_rent_cafe_rent_matrix(api_token, property_code, r["ApartmentName"], credentials, available_date_convertor(r["AvailableDate"]))
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
                unit = Unit.where(provider: "yardirentcafe", community_id: @credentials.community_id, provider_unit_id: r["ApartmentId"]).first_or_initialize
                
                unless unit.manual_override
                  unit.property_id = r["PropertyId"]
                  unit.unit_type = r["ApartmentName"]
                  unless unit.name_is_updated.present? && unit.name_is_updated
                    unit.marketing_name = r["ApartmentName"]
                  end
                  unless unit.floor_is_updated.present? && unit.floor_is_updated
                    unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                  end
                  unless unit.floorplan_id_is_updated.present? && unit.floorplan_id_is_updated
                    unit.floorplan_id = r["FloorplanId"]
                  end

                  unit.market_rent = r["MinimumRent"]
                  unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated
                    unit.effective_rent = r["MinimumRent"]
                  end

                  unless unit.availability_is_updated.present? && unit.availability_is_updated
                    unit.availability = "Unoccupied"
                  end

                  if ( r["AvailableDate"] != "" && r["AvailableDate"] != nil )
                    unless unit.availability_is_updated.present? && unit.availability_is_updated
                      unit.availability = "Unoccupied"
                    end

                    unless unit.available_date_is_updated.present? && unit.available_date_is_updated
                      unit.available_date = Date.parse(set_availabilty_date(r["AvailableDate"]))
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
                  
                  unit.unit_status = r["UnitStatus"] rescue ""

                  unit.min_effective_rent = r["MinimumRent"] if r["MinimumRent"].present?
                  unit.max_effective_rent = r["MaximumRent"] if r["MaximumRent"].present?
                  
                  if unit.effective_rent <= 0
                    unit.effective_rent = 1.0
                  end

                  unit.manually_updated = false
                  unit.availability_url = r["ApplyOnlineURL"] if r["ApplyOnlineURL"].present?
                  leasing = ""
                  lease_prices_array = []

                  if  unit.available
                    rentStrs = yardi_rent_cafe_rent_matrix(api_token, property_code, r["ApartmentName"], credentials, available_date_convertor(r["AvailableDate"]))

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
        request_type = "floorplan"
        company_code = @credentials.c_code
        api_token = @credentials.api_token
        showallunit =  @credentials.limit_result ? "0" : "-1"

        if api_token.present?
          @url = "#{@credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=#{showallunit}"
        else
          @url = "#{@credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=#{showallunit}"
        end
        
        response = HTTParty.get(@url)
        response = JSON.parse(response.body)

        if response[0]["Error"].nil?
          response.each do |r|
            fp = @all_floorplans_hash[r["FloorplanId"].to_s]
            
            if fp.present?
              # puts "----------------- #{fp.name} -----------------------\n"
              unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated && fp.manual_override
                fp.market_rent = r["MinimumRent"]
              end

              import_floorplans << fp
            else
              fp = Floorplan.where(provider: "yardirentcafe", community_id: @credentials.community_id, provider_floorplan_id: r["FloorplanId"]).first_or_initialize

              unless fp.manual_override
                fp.property_id = r["PropertyId"]
                fp.provider_floorplan_id = r["FloorplanId"]

                unless fp.name_is_updated.present? && fp.name_is_updated
                  fp.name = r["FloorplanName"]
                end

                fp.unit_count = r[""]
                fp.units_available = r[""]

                unless fp.bedroom_is_updated.present? && fp.bedroom_is_updated
                  fp.bedrooms = r["Beds"]
                end

                unless fp.bathroom_is_updated.present? && fp.bathroom_is_updated
                  fp.bathrooms = r["Baths"]
                end

                unless fp.square_feet_is_updated.present? && fp.square_feet_is_updated
                  if r["MinimumSQFT"].present?
                    fp.square_feet = r["MinimumSQFT"]
                  elsif r["SQFT"].present?
                    fp.square_feet = r["SQFT"]
                  end
                end

                unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated
                  fp.market_rent = r["MinimumRent"]
                end

                fp.deposit = r["MinimumDeposit"]

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

  def available_date_convertor available_date
    today_date = Date.today.strftime("%m/%d/%Y")

    if ( available_date != "" && available_date != nil )
      parsed_today_date = Date.parse(set_availabilty_date(today_date))
      parsed_available_date = Date.parse(set_availabilty_date(available_date))

      if parsed_available_date > parsed_today_date
        available_date
      else
        today_date
      end
    else
      today_date
    end
  end

  def yardi_rent_cafe_rent_matrix(api_token, property_code, apartment_name, credentials, available_date)
    begin
      request_type = "pricingmatrix"
      url = "#{@credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&ApartmentName=#{apartment_name}&availabledate=#{available_date}"
      response = HTTParty.get(url)
      rent_matrix = JSON.parse(response.body)

      unless rent_matrix[0]["Error"].present?
        uniq_terms = rent_matrix.map{|x| x["Term"].to_i }.uniq
        distinct_data = uniq_terms.map{|term| rent_matrix.map{|data| data if data["Term"] == term.to_s}.compact}.compact
        return distinct_data.map{|data| data.map{|r| [r["Rent"].to_i, r["Term"], r["Start_Date"], r["End_Date"]]}.min}
      else
        return nil
      end

    rescue => ex
      raise ex
    end
  end
end
