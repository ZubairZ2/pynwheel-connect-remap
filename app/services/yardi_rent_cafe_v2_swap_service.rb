class YardiRentCafeV2SwapService < BaseService

  def perform
    import_yardirentcafe_floorplans
    import_yardirentcafe_units
    rename_provider
  end

  private

    def import_yardirentcafe_units
      property_codes = credentials.p_code.split(',') rescue []
      property_codes.each do |property_code|
        begin
          response = get_appartments_availability(property_code)
          if response.present?
            response.each do |r|
              begin
                unit = Unit.where(community_id: credentials.community_id, marketing_name: r["apartmentName"])
                
                if unit.count > 1
                  unit = Unit.where(community_id: credentials.community_id, marketing_name: r["apartmentName"], floorplan_id: Floorplan.find_by(name: r["floorplanName"]).provider_floorplan_id)
                end

                if unit.present?
                  unit = unit.first
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
                  dup = Unit.find_by(community_id: credentials.community_id, provider_unit_id: r["apartmentId"])
                  
                  if dup.present?
                    dup.destroy
                  end

                  unit = Unit.new
                  unit.community_id = credentials.community_id
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
                ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
              end
            end
          else
          end
        rescue => e
        end
      end
    end

    def import_yardirentcafe_floorplans
      property_codes = credentials.p_code.split(',') rescue []
      property_codes.each do |property_code|
        begin
          response = get_floorplan_details(property_code)

          if response.present?
            response.each do |r|
              fp = Floorplan.where(community_id: credentials.community_id, name: r["floorplanName"])

              if fp.count > 1
                fp = Floorplan.where(community_id: credentials.community_id,name: r["floorplanName"],square_feet: r["minimumSQFT"],bedrooms: r["beds"],bathrooms: r["baths"])
              end

              if fp.present?
                fp = fp.first
                fp.provider = "yardirentcafe_new"
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
                dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: r["floorplanId"])

                if dup.present?
                  dup.destroy
                end

                fp = Floorplan.new
                fp.community_id = credentials.community_id
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
          else
          end
        rescue => e
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

    def rename_provider
      fp = Floorplan.where(community_id: credentials.community_id)
      fp.each do |d|
        unless d.provider == "yardirentcafe_new"
          d.destroy
        end
      end
      unit = Unit.where(community_id: credentials.community_id)
      unit.each do |d|
        unless d.provider == "yardirentcafe_new" || d.provider == "manually"
          d.destroy
        end
      end
      unit = Unit.where(community_id: credentials.community_id)
      unit.each do |d|
        if d.provider == "yardirentcafe_new"
          d.provider = "yardirentcafe"
          d.save(validate: false)
        end
      end

      fp = Floorplan.where(community_id: credentials.community_id)
      fp.each do |d|

        if d.provider == "yardirentcafe_new"
          d.provider = "yardirentcafe"
          d.save(validate: false)
        end
      end
    end

    def yardi_rent_cafe_rent_matrix(property_code, apartment_name)
      begin
        rent_matrix = get_apartment_pricing_details(property_code, apartment_name)
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
      DataProviders::RentCafe::V2ApisService.new(credentials.community_id).get_apartment_availability(property_code)
    end

    def get_apartment_pricing_details property_code, apartment_name
      DataProviders::RentCafe::V2ApisService.new(credentials.community_id).get_apartment_pricing_matrix(apartment_name, property_code)
    end

    def get_floorplan_details property_code
      DataProviders::RentCafe::V2ApisService.new(credentials.community_id).get_floorplans(property_code)
    end
end