module DataProviders
  module RentCafe
    class V2ApisService
      def initialize(community_id)
        return unless community_id.present?
        begin
          @community = Community.find community_id
          @credential = @community.credential
          
          return unless @credential.present?
          return unless is_user_authorized?

        rescue
          return
        end
      end

      def get_apartment_availability property_code
        response = fetch_apartment_availability_data(property_code)
        response["apartmentAvailabilities"] rescue []
      end

      def get_apartment_pricing_matrix apartment_name, property_code, available_date
        response = fetch_apartment_pricing_data(apartment_name, property_code, available_date)
        response["pricingDetails"] rescue []
      end

      def get_floorplans property_code
        response = fetch_floorplans_data(property_code)
        response["floorplans"] rescue []
      end

      def get_property_details property_code
        response = fetch_property_details(property_code)
        response["properties"][0] rescue []
      end

      def get_discovery_sources property_code
        response = fetch_discovery_sources_data(property_code)
        response["sources"].map{|s| s if s["useOnWebsite"]}.compact.uniq rescue []
      end

      def get_available_slots property_code
        response = fetch_available_slots(property_code)
        response["availableSlots"] rescue []
      end

      def get_additional_fees property_code
        response = fetch_additional_fees(property_code)
        response["leaseFeesDetails"] rescue []
      end

      def is_user_authorized?
        begin
          token_expired? ? renew_token : true
        rescue
          false
        end
      end 

      private

        def token_expired?
          @credential&.rentcafe_v2_auth_token.nil? || Time.now >= @credential&.rentcafe_v2_token_expires_at
        end

        def renew_token
          response = get_token()
          return false unless response['access_token'].present?
          
          @credential.update(
            rentcafe_v2_auth_token: response['access_token'], 
            rentcafe_v2_token_expires_at: (Time.now + response['expires_in'])
          )

          return true
        end

        def get_token
          url = "#{ENV["RENT_CAFE_V2_AUTH_BASE_URL"]}/connect/token"
          HTTParty.post(url,
            body: get_auth_params(),
            headers: { 'Content-Type' => 'application/x-www-form-urlencoded' }
          )
        end

        def fetch_property_details property_code
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/property/getpropertydetails"

          HTTParty.post(url,
            body: get_property_details_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        def fetch_additional_fees property_code
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/UnitPricingData/getunitleasefeesdetails"

          HTTParty.post(url,
            body: get_additional_fees_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        def fetch_apartment_availability_data property_code
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/apartmentavailability/getapartmentavailability"

          HTTParty.post(url,
            body: get_apartment_availability_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        def fetch_apartment_pricing_data apartment_name, property_code, available_date
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/UnitPricingData/getunitpricingdetails"
          HTTParty.post(url,
            body: get_unit_pricing_params(apartment_name, property_code, available_date),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        def fetch_floorplans_data property_code
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/floorplan/getfloorplans"

          HTTParty.post(url,
            body: get_floorplan_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        def fetch_discovery_sources_data property_code
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/property/getpropertyconfiguration"

          HTTParty.post(url,
            body: get_property_sources_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        # This API comes under RentCafe marketing API
        def fetch_available_slots property_code
          url = "#{ENV["RENT_CAFE_V2_MARKETING_API_BASE_URL"]}/appointments/getavailableslots"

          HTTParty.post(url,
            body: available_slots_body_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        def get_auth_params
          {
            username: ENV['RENT_CAFE_V2_USERNAME'],
            password: ENV['RENT_CAFE_V2_PASSWORD'],
            client_id: ENV['RENT_CAFE_V2_CLIENT_ID'],
            grant_type: 'password'
          }
        end

        def get_apartment_availability_params property_code
          {
            apiToken: api_token, #required
            companyCode: company_code, #required
            propertyCode: property_code&.strip, #required
            showAllUnit: !@credential&.limit_result
          }.to_json
        end

        def get_additional_fees_params property_code
          {
            apiToken: api_token, #required
            companyCode: company_code, #required
            propertyCode: property_code&.strip #required
          }.to_json
        end

        def get_unit_pricing_params apartment_name, property_code, available_date
          {
            apiToken: api_token, #required
            companyCode: company_code, #required
            propertyCode: property_code&.strip, #required
            apartmentName: apartment_name,
            showAllUnit: !@credential&.limit_result,
            pricingStartDate: available_date
          }.to_json
        end

        def get_floorplan_params property_code
          {
            apiToken: api_token, #required
            companyCode: company_code, #required
            propertyCode: property_code&.strip, #required
          }.to_json
        end

        def get_property_details_params property_code
          {
            apiToken: api_token,
            companyCode: company_code,
            propertyCode: property_code&.strip
          }.to_json
        end

        def get_property_sources_params property_code
          {
            apiToken: api_token,
            companyCode: company_code,
            propertyCode: property_code&.strip
          }.to_json
        end

        def available_slots_body_params property_code
          {
            apiToken: api_token,
            companyCode: company_code,
            propertyCode: property_code
          }.to_json
        end

        def api_token
          @credential&.api_token&.strip
        end

        def company_code
          @credential&.c_code&.strip
        end
    end
  end
end