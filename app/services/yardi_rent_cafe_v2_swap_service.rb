class YardiRentCafeV2SwapService < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
  end

  def perform
    begin
      property_codes = @credentials.p_code.split(',') rescue []
      property_codes.each do |property_code|
        import_yardirentcafe_floorplans(property_code)
        import_yardirentcafe_units(property_code)
        yardi_rent_cafe_rent_matrix(property_code)
        rename_provider
      end
    rescue => exception
      raise exception
    end
  end

  private

    def import_yardirentcafe_units property_code
      response = get_appartments_availability(property_code)
      if response.present?
        response.each do |r|
          unit = fetch_unit_record(r)

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

            unit.save
          end
        end
      end
    end

    def import_yardirentcafe_floorplans property_code
      response = get_floorplan_details(property_code)
      if response.present?
        response.each do |r|
          fp = fetch_floorplan_record(r)
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
    end

    def yardi_rent_cafe_rent_matrix(property_code)
      rent_matrix = get_apartment_pricing_details(property_code)
      if rent_matrix.present?
        uniq_units = rent_matrix.map{|x| x["apartmentId"].to_i }&.compact&.uniq
        uniq_units.each do |apartment_id|
          unit = Unit.find_by(provider: "yardirentcafe", community_id: @community_id, provider_unit_id: apartment_id)

          if unit.present?
            apartment_pricing = rent_matrix.map{|data| data if data["apartmentId"] == apartment_id}.compact
            uniq_terms = rent_matrix.map{|x| x["term"].to_i }.uniq
            distinct_data = uniq_terms.map{|term| apartment_pricing.map{|data| data if data["term"] == term.to_s}.compact}.compact
            rentStrs = distinct_data.map{|data| data.map{|r| [r["rent"].to_i, r["term"], r["start_Date"], r["end_Date"]]}.min}
            calculate_lease_pricing(unit, rentStrs)
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
    end

    def set_availabilty_date(available_date)
      available_date = available_date.split("/")
      "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
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