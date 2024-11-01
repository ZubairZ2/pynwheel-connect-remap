class YardiRentCafeStaticService < BaseService

  def perform
    import_property_details
    import_yardirentcafe_floorplans
    import_yardirentcafe_units
  end

  def import_property_details
    DataProviders::PropertyDetails::RentCafePropertyDetailsService.new(credentials.community_id).perform()
  end

  def import_yardirentcafe_units
    property_codes = credentials.p_code.split(',') rescue []
    property_codes.each do |property_code|
      begin
        request_type = "apartmentavailability"
        company_code = credentials.c_code
        api_token = credentials.api_token
        showallunit =  credentials.limit_result ? "0" : "-1"

        #property_code = credentials.p_code
        if api_token.present?
          @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=#{showallunit}"
        else
          @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=#{showallunit}"
        end
        response = HTTParty.get(@url)
        response = JSON.parse(response.body)

        if response[0]["Error"].nil?
          response.each do |r|
            begin
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
                unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
                  unit.effective_rent = r["MinimumRent"]
                end

                unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                  unit.availability = "Unoccupied"
                end

                if ( r["AvailableDate"] != "" && r["AvailableDate"] != nil )
                  unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
                    unit.availability = "Unoccupied"
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
                  if unit.availability == "Occupied"
                    unit.available = false
                  else
                    unit.available = true
                  end

                end
                unit.square_feet = r["SQFT"] if r["SQFT"].present?
                unit.unit_status = r["UnitStatus"] rescue ""
                unit.min_effective_rent = r["MinimumRent"] if r["MinimumRent"].present?
                unit.max_effective_rent = r["MaximumRent"] if r["MaximumRent"].present?
                if unit.effective_rent <= 0
                  unit.effective_rent = 1.0
                end
                unit.manually_updated = false
                unit.availability_url = r["ApplyOnlineURL"] if r["ApplyOnlineURL"].present?

                rentStrs = yardi_rent_cafe_rent_matrix(api_token, property_code, r["ApartmentName"], credentials, available_date_convertor(r["AvailableDate"]))
                leasing = ""
                
                if rentStrs.present?
                  rentStrs.each do |rentStr|
                    if rentStr[0].to_i > 0
                      leasing = leasing + rentStr[1] + ":" + rentStr[0].to_s + "::" +  rentStr[2].split(" ")[0] + ":" + rentStr[3].split(" ")[0] + ';' rescue ""
                    end
                  end
                end

                unit.lease_pricing = leasing
                unit.description = unit_description(r["Amenities"]) if r["Amenities"].present?
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
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def unit_description description
    return "" unless description.present?
    "<ul>#{description&.split("^")&.map{|desc| "<li>#{desc}</li>"}&.join("")}</ul>"
  end

  def import_yardirentcafe_floorplans
    property_codes = credentials.p_code.split(',') rescue []
    property_codes.each do |property_code|
      begin
        request_type = "floorplan"
        company_code = credentials.c_code
        api_token = credentials.api_token
        showallunit =  credentials.limit_result ? "0" : "-1"

        #property_code = credentials.p_code
        if api_token.present?
          @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=#{showallunit}"
        else
          @url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=#{showallunit}"
        end
        response = HTTParty.get(@url)
        response = JSON.parse(response.body)
        if response[0]["Error"].nil?
          response.each do |r|
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
              add_floorplan_images(fp, r['FloorplanImageURL'])
              add_floorplan_virtual_url(fp, r["FpVideoEmbedCode"])

              fp.save(validate: false)
            end
          end
        else
        end
      rescue => e
        #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
      end
    end
  end

  def add_floorplan_virtual_url fp, embedded_video
    virtual_url = embedded_video&.match(/src=\"(.*?)\"/)[1] rescue ""
    fp.virtual_tour_url = virtual_url
  end    

  def add_floorplan_images fp, image_urls
    primary_image = fetch_floorplan_image_url(image_urls, 0)
    secondary_image = fetch_floorplan_image_url(image_urls, 1)
    fp.image = image_base64(primary_image) if primary_image.present?
    fp.secondary_image = image_base64(secondary_image) if secondary_image.present?
  end

  def fetch_floorplan_image_url image_urls, index
    return unless image_urls.present?
    urls = image_urls&.split(",")&.reverse  
    urls[index]
  end

  def image_base64(image_url)
    return unless image_url.present?
    encoded_url = URI::DEFAULT_PARSER.escape(image_url)
    uri = URI.parse(encoded_url)
    file = uri.open
    image_data = file.read
    encoded_image = Base64.strict_encode64(image_data)
    "data:image/png;base64,#{encoded_image}"
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
    request_type = "pricingmatrix"
    url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&ApartmentName=#{apartment_name}&availabledate=#{available_date}"
    begin
      response = HTTParty.get(url)
      rent_matrix = JSON.parse(response.body)
      unless rent_matrix[0]["Error"].present?
        uniq_terms = rent_matrix.map{|x| x["Term"].to_i }.distinct
        distinct_data = uniq_terms.map{|term| rent_matrix.map{|data| data if data["Term"] == term.to_s}.compact}.compact
        return distinct_data.map{|data| data.map{|r| [r["Rent"].to_i, r["Term"], r["Start_Date"], r["End_Date"]]}.min}
      else
        return nil
      end
    rescue => ex
      return nil
    end
  end
end