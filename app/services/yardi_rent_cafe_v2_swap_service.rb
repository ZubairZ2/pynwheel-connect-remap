class YardiRentCafeV2SwapService < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
  end

  def perform
    import_yardirentcafe_floorplans
    import_yardirentcafe_units
    rename_provider
  end

  private

    def import_yardirentcafe_units
      property_codes = @credentials.p_code.split(',') rescue []
      property_codes.each do |property_code|
        begin
          response = get_appartments_availability(property_code)
          if response.present?
            response.each do |r|
              begin
                unit = fetch_unit_record(r)
                puts "\n#{unit&.marketing_name}\n"

                if unit.present?
                  unit.provider = "yardirentcafe_new"
                  unit.provider_unit_id = r["apartmentId"]
                  unit.property_id = r["propertyId"]
                  unit.unit_type = r["apartmentName"]
                  unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                  unit.floorplan_id = r["floorplanId"]
                  unit.market_rent = r["minimumRent"]
                  unit.effective_rent = r["minimumRent"]
                  unit.square_feet = r["sqft"] if r["sqft"].present?
                  unit.availability = "Unoccupied"
                  unit.unit_status = r["unitStatus"] rescue ""

                  if ( r["availableDate"] != "" && r["availableDate"] != nil )
                    unit.available = true
                    unit.availability = "Unoccupied"
                    unit.available_date = Date.parse(set_availabilty_date(r["availableDate"]))
                  else
                    unit.available = false
                    unit.availability = "Occupied"
                    unit.available_date = ""
                  end

                  if unit.effective_rent <= 0
                    unit.effective_rent = 1.0
                  end

                  rentStrs = yardi_rent_cafe_rent_matrix(property_code, r["apartmentName"], available_date_convertor(r["availableDate"]))
                  leasing = ""

                  if rentStrs.present?
                    rentStrs.each do |rentStr|
                      if rentStr[0].to_i > 0
                        leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                      end
                    end
                  end

                  unit.lease_pricing = leasing

                  unit.save
                else
                  unit = Unit.new
                  unit.community_id = @credentials.community_id
                  unit.provider = "yardirentcafe_new"
                  unit.property_id = r["propertyId"]
                  unit.provider_unit_id = r["apartmentId"]
                  unit.unit_type = r["apartmentName"]
                  unit.marketing_name = r["apartmentName"]
                  unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                  unit.floorplan_id = r["floorplanId"]
                  unit.square_feet = r["sqft"] if r["sqft"].present?
                  unit.market_rent = r["minimumRent"]
                  unit.effective_rent = r["minimumRent"]
                  unit.unit_status = r["unitStatus"] rescue ""

                  if ( r["availableDate"] != "" && r["availableDate"] != nil )
                    unit.available = true
                    unit.availability = "Unoccupied"
                    unit.available_date = Date.parse(set_availabilty_date(r["availableDate"]))
                  else
                    unit.available = false
                    unit.availability = "Occupied"
                    unit.available_date = ""
                  end

                  if unit.effective_rent <= 0
                    unit.effective_rent = 1.0
                  end

                  rentStrs = yardi_rent_cafe_rent_matrix(property_code, r["apartmentName"], available_date_convertor(r["availableDate"]))
                  leasing = ""
                  
                  if rentStrs.present?
                    rentStrs.each do |rentStr|
                      if rentStr[0].to_i > 0
                        leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                      end                  
                    end
                  end

                  unit.lease_pricing = leasing

                  unit.save
                end
              rescue => e
                puts "\n\n\n #{e.message} \n\n\n"
                ExceptionNotifier.notify_exception(e, data: {community_id: @credentials.community_id})
              end
            end
          else
          end
        rescue => e
        end
      end
    end

    def import_yardirentcafe_floorplans
      property_codes = @credentials.p_code.split(',') rescue []
      property_codes.each do |property_code|
        begin
          response = get_floorplan_details(property_code)

          if response.present?
            response.each do |r|
              fp = fetch_floorplan_record(r)
              puts "\n#{fp&.name}\n"
              if fp.present?
                fp.provider = "yardirentcafe_new"
                fp.name = r["floorplanName"]
                fp.provider_floorplan_id = r["floorplanId"]
                fp.property_id = r["propertyId"]
                fp.provider_floorplan_id = r["floorplanId"]
                fp.unit_count = r[""]
                fp.units_available = r[""]
                fp.bedrooms = r["beds"]
                fp.bathrooms = r["baths"]

                if r["minimumSQFT"].present?
                  fp.square_feet = r["minimumSQFT"]
                elsif r["sqft"].present?
                  fp.square_feet = r["sqft"]
                end

                fp.market_rent = r["minimumRent"]
                fp.deposit = r["minimumDeposit"]
                fp.save(validate: false)
              else
                fp = Floorplan.new
                fp.community_id = @credentials.community_id
                fp.provider = "yardirentcafe_new"
                fp.property_id = r["propertyId"]
                fp.provider_floorplan_id = r["floorplanId"]
                fp.name = r["floorplanName"]
                fp.unit_count = r[""]
                fp.units_available = r[""]
                fp.bedrooms = r["beds"]
                fp.bathrooms = r["baths"]

                if r["minimumSQFT"].present?
                  fp.square_feet = r["minimumSQFT"]
                elsif r["sqft"].present?
                  fp.square_feet = r["sqft"]
                end

                fp.market_rent = r["minimumRent"]
                fp.deposit = r["minimumDeposit"]
                fp.save(validate: false)
              end
            end
          end
        rescue => e
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

    def rename_provider
      property_floorplans = Floorplan.where(community_id: @credentials.community_id)
      property_units = Unit.where(community_id: @credentials.community_id)

      property_floorplans.where.not(provider: "yardirentcafe_new").destroy_all
      property_units.where.not(provider: "yardirentcafe_new").destroy_all

      property_floorplans.where(provider: "yardirentcafe_new").update_all(provider: "yardirentcafe")
      property_units.where(provider: "yardirentcafe_new").update_all(provider: "yardirentcafe")
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

    def fetch_floorplan_record(r)
      fp = Floorplan.where(community_id: @credentials.community_id)
    
      if r["floorplanName"].present?
        fp = fp.where(name: r["floorplanName"])
        fp = fp.where(square_feet: r["minimumSQFT"], bedrooms: r["beds"], bathrooms: r["baths"]) if fp.count > 1
      end
    
      if r["unitTypeMapping"].present? && fp.blank?
        fp = Floorplan.where(provider_floorplan_id: r["unitTypeMapping"])
        fp = fp.where(square_feet: r["minimumSQFT"], bedrooms: r["beds"], bathrooms: r["baths"]) if fp.count > 1
      end
    
      fp.first
    rescue => e
      nil
    end

    def fetch_unit_record(r)
      unit = Unit.where(community_id: @credentials.community_id)
      fp = Floorplan.where(community_id: @credentials.community_id)

      fp = fp.where(name: r["floorplanName"])
      fp = fp.where("provider_floorplan_id LIKE ?", "%#{r["floorplanName"]}") if fp.blank?
      fp = fp.where(square_feet: r["minimumSQFT"], bedrooms: r["beds"], bathrooms: r["baths"]) if fp.count > 1
      fp = fp.first

      if r["apartmentName"].present?
        unit = unit.where(marketing_name: r["apartmentName"])
        unit = unit.where(floorplan_id: fp.provider_floorplan_id) if unit.count > 1
      end

      unit.first
      
    rescue => e
      nil
    end

    def update_additional_fees
      begin
        return unless @all_units_hash.present?

        property_codes = @credentials.p_code.split(',') rescue []

        property_codes.each do |property_code|
          import_units = []
          response = get_additional_fees(property_code)
          if response.present?
            response.each do |r|
              unit = @all_units_hash[r["apartmentId"].to_s]
              if unit.present?
                fee_list = process_lease_fees_details(r)
                unit.additional_fee = fee_list
                import_units << unit
              end
            end

            ProvidersDataUpdationService.new().update_or_create_units_records(import_units)
          end
        end

      rescue => e
        raise e
      end
    end
    
    def process_lease_fees_details(apartment)
      return "" if apartment["moveInFees"].blank?
    
      fee_items = apartment["moveInFees"].map do |fee|
        (fee["feeCost"].to_i > 0) ? "<li>#{fee["feeName"].to_i}: #{fee["feeCost"].to_i}</li>" : ""
      end.join
    
      "<ul>#{fee_items}</ul>"
    end

    def get_additional_fees property_code
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_additional_fees(property_code)
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