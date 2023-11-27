module DataProviders
  module PropertyDetails
    class RentCafePropertyDetailsService < DataProviders::PropertyDetails::BaseService

      def perform
        if @credential.rentcafe_api_version == "RentCafe V2"
          return unless @credential&.rentcafe_v2_auth_token.present?
        end

        property_codes = @credential.p_code.split(',') rescue []
        property_codes.each do |property_code|
          begin
            response = handle_rent_cafe_version_response(property_code)
            next unless response.present?
            update_property_details(response)
          rescue => exception
            raise exception
          end
        end
      end

      private

        def handle_rent_cafe_version_response property_code
          if @credential.rentcafe_api_version == "RentCafe V2"
            response = fetch_property_details_v2(property_code)
          else
            response = fetch_property_details_v1(property_code)
          end

          response[0] rescue []
        end

        def fetch_property_details_v2 property_code
          url = "#{ENV["RENT_CAFE_V2_BASE_URL"]}/property/getpropertydetails"

          response = HTTParty.post(url,
            body: property_details_v2_params(property_code),
            headers: { 
              'Content-Type' => 'application/json',
              'Authorization' => "Bearer #{@credential&.rentcafe_v2_auth_token}",
              'vendor' => ENV['RENT_CAFE_V2_USERNAME']
            }
          )

          response["properties"]
        end

        def fetch_property_details_v1 property_code
          response = HTTParty.get(property_details_v1_request_url(property_code),
            headers: { 
              'Content-Type' => 'application/json',
            }
          )

          JSON.parse(response)
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

        def property_details_v1_request_url property_code
          if api_token.present?
            url = "#{rent_cafe_api_v1_base_url}/rentcafeapi.aspx?requestType=property&APIToken=#{api_token}&propertycode=#{property_code}"
          else
            url = "#{rent_cafe_api_v1_base_url}/rentcafeapi.aspx?requestType=property&companyCode=#{company_code}&propertycode=#{property_code}"
          end
        end

        def property_details_v2_params property_code
          {
            apiToken: api_token,
            companyCode: company_code,
            propertyCode: property_code&.strip
          }.to_json
        end

        def rent_cafe_api_v1_base_url
          @credential.yardi_rent_cafe_api_url
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
