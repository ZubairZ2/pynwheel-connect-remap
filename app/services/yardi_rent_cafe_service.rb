class YardiRentCafeService < BaseService

  def perform
    import_yardirentcafe_floorplans
    import_yardirentcafe_units #if Thread.current[:errors].empty?
  end

  def import_yardirentcafe_floorplans
    begin
        request_type = "apartmentavailability"
        company_code = credentials.c_code
        api_token = credentials.api_token
        property_code = credentials.p_code
        if api_token.present?
          @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=-1"
        else
          @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1"
        end
        response = HTTParty.get(@url)
        response = JSON.parse(response.body)
        
      if response[0]["Error"].nil?
          response.each do |r|
            puts '-----------------' , r
            begin
              
                unit = Unit.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_unit_id: r["ApartmentId"]).first_or_initialize
                unless unit.updated_by_admin
                  unit.property_id = r["PropertyId"]
                  unit.unit_type = r["ApartmentName"]
                  unit.marketing_name = r["ApartmentName"]
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
                  unit.save
                end
                # if r["Amenities"] != ""

                #   amenities = r["Amenities"]
                #   puts '*********************** a' , amenities.inspect
                #   if amenities.index("^") == nil
                #     amenity = Amenity.where(unit_id: unit.id).first_or_initialize
                #     amenity.provider_amenity_id = amenities
                #     amenity.save
                #     puts '*********************** u' , amenity
                #   else
                #     amenities = amenities.split("^")
                #     amenities.each do |a|
                #       amenity = Amenity.where(unit_id: unit.id).first_or_initialize
                #       amenity.provider_amenity_id = a
                #       amenity.save
                #       puts '*********************** l' , amenity
                #     end
                #   end
                # end

              
            rescue => e 
              puts '-------------------------' , e.message
              ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id}) 
            end
          end
      else
        #Thread.current[:errors] << "Invalid credentials.Please enter correct one and try again."
        puts  "Invalid credentials.Please enter correct one and try again." 
        #ExceptionNotifier.notify_exception(Exception.new,data: {message: "Invalid credentials.Please enter correct one and try again." ,community_id: credentials.community_id})  
      end
    rescue => e 
      #Thread.current[:errors] = e.message
      puts '------------------------------' , e.message
      ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})  
    end
  end

  def import_yardirentcafe_units
    begin
      request_type = "floorplan"
      company_code = credentials.c_code
      api_token = credentials.api_token
      property_code = credentials.p_code
      if api_token.present?
        @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}&propertycode=#{property_code}&showallunit=-1"
      else
        @url = "https://api.rentcafe.com/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}&propertycode=#{property_code}&showallunit=-1"
      end
      response = HTTParty.get(@url)
      response = JSON.parse(response.body)
      if response[0]["Error"].nil?
        response.each do |r|
          puts '-----------------' , r
          #fp = Floorplan.new(provider: "yardirentcafe",community_id: 1)
          fp = Floorplan.where(provider: "yardirentcafe",community_id: credentials.community_id,provider_floorplan_id: r["FloorplanId"]).first_or_initialize
          unless fp.updated_by_admin
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
        #Thread.current[:errors] << "Invalid credentials.Please enter correct one and try again."    
        puts '"Invalid credentials.Please enter correct one and try again."'
        #ExceptionNotifier.notify_exception(Exception.new,data: {message: "Invalid credentials.Please enter correct one and try again." ,community_id: credentials.community_id})  
      end
    rescue => e 
      #Thread.current[:errors] = e.message
      puts '-------------------------' , e.message
      ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id}) 
    end
  end

  def set_availabilty_date(available_date)
    available_date = available_date.split("/")
    "#{available_date[2]}-#{available_date[0]}-#{available_date[1]}"
  end

end