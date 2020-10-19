class YardiRentCafeService < BaseService

  def perform
    import_yardirentcafe_floorplans
    import_yardirentcafe_units 
  end

  def import_yardirentcafe_units
    @unit_record = []
    property_codes = credentials.p_code.split(',') rescue []
    property_codes.each do |property_code|
      begin
        request_type = "apartmentavailability"
        company_code = credentials.c_code
        api_token = credentials.api_token
        #property_code = credentials.p_code
        showallunit =  credentials.limit_result ? "0" : "-1"
        if api_token.present?
          @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=" + showallunit
        else
          @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=" + showallunit
        end
        response = HTTParty.get(@url)
        response = JSON.parse(response.body)


        unit_present =  Unit.where("community_id = ? AND provider IN (?)", credentials.community_id,  ["yardirentcafe"]).map{|x| x.provider_unit_id}
        if response[0]["Error"].nil?
          response.each do |r|
            begin
              unit = Unit.find_by(provider: "yardirentcafe",community_id: credentials.community_id,provider_unit_id: r["ApartmentId"])#.first_or_initialize
              if unit.present?
                # unit.property_id = r["PropertyId"]
                # unit.unit_type = r["ApartmentName"]
                # unit.marketing_name = r["ApartmentName"]
                # unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                # unit.floorplan_id = r["FloorplanId"]
                unit.market_rent = r["MinimumRent"]
                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                  unit.effective_rent = r["MinimumRent"]
                end
                unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                  unit.availability = "Unoccupied" if !unit.sold
                end
                unit.availability = "Unoccupied" if !unit.sold
                if r["AvailableDate"] != ""
                  unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                    unit.availability = "Unoccupied" if !unit.sold
                  end
                  unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override

                    unit.available_date = Date.parse(set_availabilty_date(r["AvailableDate"]))
                  end

                else
                  unless unit.availability_is_updated.present? && unit.availability_is_updated
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
                unit.min_effective_rent = r["MinimumRent"] if r["MinimumRent"].present?
                unit.max_effective_rent = r["MaximumRent"] if r["MaximumRent"].present?
                unit.availability_url = r["ApplyOnlineURL"] if r["ApplyOnlineURL"].present?

                rentStrs = yardi_rent_cafe_rent_matrix(api_token, property_code, r["ApartmentName"])
                leasing = ""
                rentStrs.each do |rentStr|
                  leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';'
                end
                unit.lease_pricing = leasing
                

                unit.save(validate: false)

              else
                unit = Unit.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_unit_id: r["ApartmentId"]).first_or_initialize
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
                  if r["AvailableDate"] != ""
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
                  unit.min_effective_rent = r["MinimumRent"] if r["MinimumRent"].present?
                  unit.max_effective_rent = r["MaximumRent"] if r["MaximumRent"].present?
                  if unit.effective_rent <= 0
                    unit.effective_rent = 1.0
                  end
                  unit.manually_updated = false
                  unit.availability_url = r["ApplyOnlineURL"] if r["ApplyOnlineURL"].present?

                  rentStrs = yardi_rent_cafe_rent_matrix(api_token, property_code, r["ApartmentName"])
                  leasing = ""
                  rentStrs.each do |rentStr|
                    leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';'
                  end
                  unit.lease_pricing = leasing

                  unit.save(validate: false)
                end
              end
            rescue => e
              ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id}) 
            end
          end
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
          puts  "Invalid credentials.Please enter correct one and try again." 
        end
        no_unit = unit_present - @unit_record
        if @unit_record.nil?
          no_unit = nil
        end
        no_unit.each do |un|
          unit = Unit.find_by(community_id: credentials.community_id, provider_unit_id: un)
          unit.availability = "Occupied"
          unit.available = false
          unit.available_date = nil
          unit.save(validate: false) unless unit.manual_override
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

  def import_yardirentcafe_floorplans
    property_codes = credentials.p_code.split(',') rescue []
    property_codes.each do |property_code|
      begin
        request_type = "floorplan"
        company_code = credentials.c_code
        api_token = credentials.api_token
        #property_code = credentials.p_code
        if api_token.present?
          @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=-1"
        else
          @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1"
        end
        response = HTTParty.get(@url)
        response = JSON.parse(response.body)
        if response[0]["Error"].nil?
          response.each do |r|
            fp = Floorplan.find_by(provider: "yardirentcafe",community_id: credentials.community_id,provider_floorplan_id: r["FloorplanId"])#.first_or_initialize
            if fp.present?
              # fp.property_id = r["PropertyId"]
              # fp.provider_floorplan_id = r["FloorplanId"]
              # fp.name = r["FloorplanName"]
              # fp.unit_count = r[""]
              # fp.units_available = r[""]
              # fp.bedrooms = r["Beds"]
              # fp.bathrooms = r["Baths"]
              # if r["MinimumSQFT"].present?
              #   fp.square_feet = r["MinimumSQFT"]
              # elsif r["SQFT"].present?
              #   fp.square_feet = r["SQFT"]
              # end
              unless fp.market_rent_is_updated.present? && fp.market_rent_is_updated && fp.manual_override
                fp.market_rent = r["MinimumRent"]
              end

              # fp.deposit = r["MinimumDeposit"]
              fp.save(validate: false)

            else
              fp = Floorplan.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_floorplan_id: r["FloorplanId"]).first_or_initialize
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
                fp.save(validate: false)
              end
            end
          end
        else 
          puts '"Invalid credentials.Please enter correct one and try again."'
        end
      rescue => e 
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id}) 
      end
    end
  end

  def set_availabilty_date(available_date)
    available_date = available_date.split("/")
    "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
  end

  def yardi_rent_cafe_rent_matrix(api_token, property_code, apartment_name)
    request_type = "pricingmatrix"
    url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&ApartmentName=#{apartment_name}"
    
    response = HTTParty.get(url)
    rent_matrix = JSON.parse(response.body)

    uniq_terms = rent_matrix.map{|x| x["Term"].to_i }.uniq
    distinct_data = uniq_terms.map{|term| rent_matrix.map{|data| data if data["Term"] == term.to_s}.compact}.compact
    return distinct_data.map{|data| data.map{|r| [r["Rent"].to_i, r["Term"], r["Start_Date"], r["End_Date"]]}.min}
  end
end