class YardiRentCafeSwapService < BaseService

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
              unit = Unit.where(community_id: credentials.community_id,marketing_name: r["ApartmentName"]).first
              if unit.present?
                # puts "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", unit.provider
                unit.provider = "yardirentcafe_new"
                unit.provider_unit_id = r["ApartmentId"]
                unit.property_id = r["PropertyId"]
                unit.unit_type = r["ApartmentName"]
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
              else
                dup = Unit.find_by(community_id: credentials.community_id,provider_unit_id: r["ApartmentId"])
                if dup.present?
                  dup.destroy
                end
                # unit = Unit.where(community_id: credentials.community_id).first
                unit = Unit.new
                unit.community_id = credentials.community_id
                unit.provider = "yardirentcafe_new"
                unit.property_id = r["PropertyId"]
                unit.provider_unit_id = r["ApartmentId"]
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
          unit = Unit.where(community_id: credentials.community_id)
          unit.each do |d|
            unless d.provider == "yardirentcafe_new" || d.provider == "manually"
              d.destroy
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
            fp = Floorplan.where(community_id: credentials.community_id,name: r["FloorplanName"]).first
            if fp.present?
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
          fp = Floorplan.where(community_id: credentials.community_id)
          fp.each do |d|
            unless d.provider == "yardirentcafe_new"
              d.destroy
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
  def rename_provider
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

end