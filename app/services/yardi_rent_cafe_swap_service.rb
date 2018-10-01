class YardiRentCafeSwapService < BaseService

  def perform
    import_yardirentcafe_floorplans
    import_yardirentcafe_units
  end

  def import_yardirentcafe_units
    property_codes = credentials.p_code.split(',') rescue []
    property_codes.each do |property_code|
      begin
        request_type = "apartmentavailability"
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
            begin

              unit = Unit.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_unit_id: r["ApartmentId"]).first
              if unit.present?
                unit.property_id = r["PropertyId"]
                unit.unit_type = r["ApartmentName"]
                unit.marketing_name = r["ApartmentName"]
                unit.floor = evaluate_floor(unit.marketing_name) rescue nil
                unit.floorplan_id = r["FloorplanId"]
                unit.market_rent = r["MinimumRent"]
                unit.effective_rent = r["MinimumRent"]
                unit.availability = "Unoccupied"
                if r["AvailableDate"] != ""
                  unit.availability = "Unoccupied"
                  unit.available_date = Date.parse(set_availabilty_date(r["AvailableDate"]))
                else
                  unit.availability = "Occupied"
                  unit.available_date = ""
                end
                if unit.effective_rent <= 0
                  unit.effective_rent = 1.0
                end
                unit.save
              end

            rescue => e
              ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
            end
          end
        else
          puts  "Invalid credentials.Please enter correct one and try again."
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
            fp = Floorplan.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_floorplan_id: r["FloorplanId"]).first
            if fp.present?
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

end