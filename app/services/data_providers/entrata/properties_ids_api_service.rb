module DataProviders
  module Entrata
    class PropertiesIdsApiService
      def initialize(params)
        @params = params
        @password = @params[:password]
        @username = @params[:username]
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
          HTTParty.post(
            get_property_ids_endpoint,
            body: get_properties_body_params,
            headers: { 'Content-Type' => 'application/json' }
          )
        end

        def get_properties_body_params
          {
            "auth": {
              "type": "basic",
              "password": @password,
              "username": @username
            },
            "requestId": 15,
            "method": {
              "name": "getProperties",
              "version": "r1"
            }
          }.to_json
        end

        def get_property_ids_endpoint
          if  @entrata_url&.include?('https://') || @entrata_url.include?('http://')
            url = @entrata_url
          else
            url = "https://#{@entrata_url}.entrata.com/api/v1/properties"
          end
          url
        end

        def parse_properties_response response
          preoperties_id = response["response"]["result"]["PhysicalProperty"]["Property"].map{|res| {property_id: res["PropertyID"], property_name: res["MarketingName"]} }rescue []
        end

    end
  end
end
