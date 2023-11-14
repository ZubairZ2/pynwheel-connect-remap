module DataProviders
  module PropertyDetails
    class RentCafePropertyDetailsService < DataProviders::PropertyDetails::BaseService

      def perform
        return unless @credential&.rentcafe_v2_auth_token.present?

        property_codes = @credential.p_code.split(',') rescue []
        property_codes.each do |property_code|
          begin
            response = fetch_property_details(property_code)
            response = response.dig("properties", 0)
            binding.pry
            next unless response.present?
            update_property_details(response)
          rescue => exception
            raise exception
          end
        end
      end

      private

        def fetch_property_details property_code
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/property/getpropertydetails"

          HTTParty.post(url,
            body: property_details_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )
        end

        def update_property_details details
          @community.update(
            name: details["name"],
            address: details["address"],
            city: details["city"],
            state: details["state"],
            zip: details["zipcode"],
            email: details["email"],
            phone: details["phone"],
            latitude: details["latitude"],
            longitude: details["longitude"],
            website: details["url"]
          )
        end

        def property_details_params property_code
          {
            apiToken: api_token,
            companyCode: company_code,
            propertyCode: property_code&.strip
          }.to_json
        end

        def api_token
          @credential.api_token
        end

        def company_code
          @credential.c_code
        end
    end
  end
end
