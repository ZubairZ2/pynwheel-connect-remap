class YardiRentCafeV2SwapService < ::BaseService
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
          @credentials&.get_limit_result_availability()&.each do |limit_result|
            response = get_appartments_availability(property_code, limit_result)
            rentStrsHash = yardi_rent_cafe_property_rent_matrix(property_code, limit_result)

            if response.present?
              response.each do |r|
                unit = fetch_unit_record(r)

                unless unit.present?
                  unit = Unit.new
                  unit.community_id = @credentials.community_id
                  unit.marketing_name = r["apartmentName"]
                end

                apartment_id = r["apartmentId"]

                unit.voyager_property_code = r["voyagerPropertyCode"]
                unit.provider = "yardirentcafe_new"
                unit.provider_unit_id = apartment_id
                unit.property_id = property_code
                unit.unit_type = r["apartmentName"]
                unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                unit.building = evaluate_building(unit.marketing_name) rescue nil
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

                rentStrs = rentStrsHash[apartment_id]
                leasing = ""

                if rentStrs.present?
                  rentStrs.each do |rentStr|
                    if rentStr[0].to_i > 0
                      leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                    end
                  end
                end

                unit.lease_pricing = leasing
                unit.show_on_map = limit_result

                unit.save
              end
            end
          end
        rescue => e
          raise e
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

    def rename_provider
      property_floorplans = Floorplan.where(community_id: @credentials.community_id)
      property_units = Unit.where(community_id: @credentials.community_id)

      property_floorplans.where.not(provider: "yardirentcafe_new").destroy_all
      property_units.where.not(provider: "yardirentcafe_new").destroy_all

      property_floorplans.where(provider: "yardirentcafe_new").update_all(provider: "yardirentcafe")
      property_units.where(provider: "yardirentcafe_new").update_all(provider: "yardirentcafe")
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

    def get_appartments_availability property_code, limit_result
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_apartment_availability(property_code, limit_result)
    end

    def get_floorplan_details property_code
      DataProviders::RentCafe::V2ApisService.new(@credentials.community_id).get_floorplans(property_code)
    end
end