class YardiRentCafeSwapService < BaseService
  attr_reader :credentials

  def initialize(credentials)
    @credentials = credentials
  end

  def perform

    import_yardirentcafe_floorplans
    import_yardirentcafe_units
    rename_provider
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
              unit = Unit.where(community_id: credentials.community_id,marketing_name: r["ApartmentName"])
              if unit.count > 1
                unit = Unit.where(community_id: credentials.community_id,marketing_name: r["ApartmentName"],floorplan_id: Floorplan.find_by(name: r["FloorplanName"]).provider_floorplan_id)
              end
              if unit.present?
                unit = unit.first
                # puts "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", unit.provider
                unit.provider = "yardirentcafe_new"
                unit.provider_unit_id = r["ApartmentId"]
                unit.property_id = property_code
                unit.unit_type = r["ApartmentName"]
                unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                unit.floorplan_id = r["FloorplanId"]
                unit.market_rent = r["MinimumRent"]
                unit.effective_rent = r["MinimumRent"]
                unit.square_feet = r["SQFT"] if r["SQFT"].present?
                unit.availability = "Unoccupied"
                unit.unit_status = r["UnitStatus"] rescue ""

                if ( r["AvailableDate"] != "" && r["AvailableDate"] != nil )
                  unit.available = true
                  unit.availability = "Unoccupied"
                  unit.available_date = Date.parse(set_availabilty_date(r["AvailableDate"]))
                else
                  unit.available = false
                  unit.availability = "Occupied"
                  unit.available_date = ""
                end

                if unit.effective_rent <= 0
                  unit.effective_rent = 1.0
                end

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

                unit.save
              else
                dup = Unit.find_by(community_id: credentials.community_id,provider_unit_id: r["ApartmentId"])
                if dup.present?
                  dup.destroy
                end
                # unit = Unit.where(community_id: credentials.community_id).first
                unit = Unit.new
                unit.community_id = credentials.community_id
                unit.provider = "yardirentcafe_new"
                unit.property_id = property_code
                unit.provider_unit_id = r["ApartmentId"]
                unit.unit_type = r["ApartmentName"]
                unit.marketing_name = r["ApartmentName"]
                unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                unit.floorplan_id = r["FloorplanId"]
                unit.square_feet = r["SQFT"] if r["SQFT"].present?
                unit.market_rent = r["MinimumRent"]
                unit.effective_rent = r["MinimumRent"]
                unit.unit_status = r["UnitStatus"] rescue ""

                if ( r["AvailableDate"] != "" && r["AvailableDate"] != nil )
                  unit.available = true
                  unit.availability = "Unoccupied"
                  unit.available_date = Date.parse(set_availabilty_date(r["AvailableDate"]))
                else
                  unit.available = false
                  unit.availability = "Occupied"
                  unit.available_date = ""
                end

                if unit.effective_rent <= 0
                  unit.effective_rent = 1.0
                end

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

                unit.save
              end


            rescue => e
              ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
            end
          end



        else
        end
      rescue => e
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
            fp = Floorplan.where(community_id: credentials.community_id,name: r["FloorplanName"])
            if fp.count > 1
              fp = Floorplan.where(community_id: credentials.community_id,name: r["FloorplanName"],square_feet: r["MinimumSQFT"],bedrooms: r["Beds"],bathrooms: r["Baths"])
            end
            if fp.present?
              fp = fp.first
              fp.provider = "yardirentcafe_new"
              fp.provider_floorplan_id = r["FloorplanId"]
              fp.property_id = r["PropertyId"]
              fp.provider_floorplan_id = r["FloorplanId"]
              fp.unit_count = r[""]
              fp.units_available = r[""]
              fp.bedrooms = r["Beds"]
              fp.bathrooms = r["Baths"]
              if r["MinimumSQFT"].present?
                fp.square_feet = r["MinimumSQFT"]
              elsif r["SQFT"].present?
                fp.square_feet = r["SQFT"]
              end
              fp.market_rent = r["MinimumRent"]
              fp.deposit = r["MinimumDeposit"]
              fp.save(validate: false)
            else
              dup = Floorplan.find_by(community_id: credentials.community_id,provider_floorplan_id: r["FloorplanId"])
              if dup.present?
                dup.destroy
              end

              # fp = Floorplan.where(community_id: credentials.community_id).first
              fp = Floorplan.new
              fp.community_id = credentials.community_id
              fp.provider = "yardirentcafe_new"
              fp.property_id = r["PropertyId"]
              fp.provider_floorplan_id = r["FloorplanId"]
              fp.name = r["FloorplanName"]
              fp.unit_count = r[""]
              fp.units_available = r[""]
              fp.bedrooms = r["Beds"]
              fp.bathrooms = r["Baths"]
              if r["MinimumSQFT"].present?
                fp.square_feet = r["MinimumSQFT"]
              elsif r["SQFT"].present?
                fp.square_feet = r["SQFT"]
              end
              fp.market_rent = r["MinimumRent"]
              fp.deposit = r["MinimumDeposit"]
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

  def yardi_rent_cafe_rent_matrix(api_token, property_code, apartment_name, credentials, available_date)
    request_type = "pricingmatrix"
    url = "#{credentials.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&ApartmentName=#{apartment_name}&availabledate=#{available_date}"
    begin
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
      return nil
    end
  end
end