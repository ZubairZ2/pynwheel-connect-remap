module DataProviders
  module Entrata
    class PropertiesIdsApiService
      def initialize(params)
        @params = params
        @entrata_url = @params[:domain]
      end

      def get_property_ids
        response = fetch_properties_response
        parse_properties_response(JSON.parse(response.body)) if response&.body.present?

      rescue StandardError => e
        []
      end

      private

        def fetch_properties_response
          PsiService.call_entrata_api(
            subdomain: @entrata_url,
            endpoint: "properties",
            method: :post,
            payload: {
              requestId: 15,
              method: {
                name: "getProperties",
                version: "r1"
              }
            }
          )
        end

        def parse_properties_response response
          preoperties_id = response["response"]["result"]["PhysicalProperty"]["Property"].map{|res| {property_id: res["PropertyID"], property_name: res["MarketingName"]} }rescue []
        end

    end
  end
end
