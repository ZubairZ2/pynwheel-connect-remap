class YardiRentCafeStaticService < BaseService

  def perform
    import_yardirentcafe_floorplans
    import_yardirentcafe_units
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
                unit = Unit.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_unit_id: r["apartmentId"]).first_or_initialize
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

                  unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                    unit.effective_rent = r["minimumRent"]
                  end

                  unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                    unit.availability = "Unoccupied"
                  end

                  if ( r["availableDate"] != "" && r["availableDate"] != nil )
                    unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                      unit.availability = "Unoccupied"
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
                    if unit.availability == "Occupied"
                      unit.available = false
                    else
                      unit.available = true
                    end
                  end

                  unit.square_feet = r["sqft"] if r["aqft"].present?
                  unit.min_effective_rent = r["minimumRent"] if r["minimumRent"].present?
                  unit.max_effective_rent = r["maximumRent"] if r["maximumRent"].present?

                  if unit.effective_rent <= 0
                    unit.effective_rent = 1.0
                  end

                  unit.manually_updated = false
                  unit.availability_url = r["applyOnlineURL"] if r["applyOnlineURL"].present?

                  rentStrs = yardi_rent_cafe_rent_matrix(property_code, r["apartmentName"])
                  leasing = ""
                  
                  if rentStrs.present?
                    rentStrs.each do |rentStr|
                      if rentStr[0].to_i > 0
                        leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                      end
                    end
                  end

                  unit.lease_pricing = leasing
                  unit.description = unit_description(r["amenities"]) if r["amenities"].present?
                  unit.save(validate: false)
                end

              rescue => e
                ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
              end
            end
            begin
              cred = Credential.find credentials.id
              cred.data_error_message = nil
              cred.save
            rescue => err
            end
          else
            begin
              cred = Credential.find credentials.id
              cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
              cred.save
            rescue => err
            end
          end
        rescue => e
          begin
            cred = Credential.find credentials.id
            cred.data_error_message = "Unit availability and pricing data from #{cred.community.data_provider} is not available. Please contact #{cred.community.data_provider} for more information or email support@pynwheel.com."
            cred.save
          rescue => err
          end
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
              fp = Floorplan.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_floorplan_id: r["floorplanId"]).first_or_initialize
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
                fp.save(validate: false)
              end
            end
          else
          end
        rescue => e
        end
      end
    end

    def unit_description description
      return "" unless description.present?
      "<ul>#{description&.split("^")&.map{|desc| "<li>#{desc}</li>"}&.join("")}</ul>"
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

    def yardi_rent_cafe_rent_matrix(property_code, apartment_name)
      begin
        rent_matrix = get_apartment_pricing_details(property_code, apartment_name)
        unless rent_matrix.present?
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
      response = RentCafeApiV2Service.new(credentials.community_id).get_apartment_availability(property_code)
      (response&.dig("errorCode") == 200) ? response["apartmentAvailabilities"] : []
    end

    def get_apartment_pricing_details property_code, apartment_name
      response = RentCafeApiV2Service.new(credentials.community_id).get_apartment_pricing_matrix(apartment_name, property_code)
      (response&.dig("errorCode") == 200) ? response["pricingDetails"] : []
    end

    def get_floorplan_details property_code
      response = RentCafeApiV2Service.new(credentials.community_id).get_floorplans(property_code)
      (response&.dig("errorCode") == 200) ? response["floorplans"] : []    
    end
end