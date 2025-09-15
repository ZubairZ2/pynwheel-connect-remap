module DataProviders
  module RentCafe
    class V1ApisService
      def initialize(community_id)
        return unless community_id.present?

        @community = Community.find_by_id(community_id)
        @credentials = @community&.credential if @community.present?

        return unless @credentials.present?

      end

      def get_apartment_availability(property_code, limit_result = false)
        handle_api_response(fetch_data("apartmentavailability", property_code, show_all_units(limit_result)))
      end

      def get_apartment_pricing_matrix(property_code, limit_resul = false)
        handle_api_response(fetch_data("pricingmatrix", property_code, show_all_units(limit_result)))
      end

      def get_floorplans(property_code)
        handle_api_response(fetch_data("floorplan", property_code))
      end

      def get_property_details(property_code)
        response = fetch_data("property", property_code)
        handle_property_response(response)
      end

      private

        def fetch_data(request_type, property_code, additional_params = '')
          url = "#{api_base_url(request_type)}&propertycode=#{property_code}#{additional_params}"
          response = HTTParty.get(url)
          JSON.parse(response.body)
        end

        def api_base_url(request_type)
          if api_token.present?
            "#{@credentials&.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&APIToken=#{api_token}"
          else
            "#{@credentials&.yardi_rent_cafe_api_url}/rentcafeapi.aspx?requestType=#{request_type}&companyCode=#{company_code}"
          end
        end

        def handle_api_response(response)
          response[0]["Error"].nil? ? response : nil
        end

        def handle_property_response(response)
          response[0]["Error"].nil? ? response[0] : nil
        end

        def api_token
          @credentials&.api_token&.strip
        end

        def company_code
          @credentials&.c_code&.strip
        end

        def show_all_units limit_result
          "&showallunit=#{limit_result ? "0" : "-1"}"
        end
    end
  end
end
