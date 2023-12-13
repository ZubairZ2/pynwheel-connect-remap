module DataProviders
  module Entrata
    class ApisService
      def initialize(community_id)
        return unless community_id.present?

        @community = Community.find_by_id(community_id)
        @credential = @community&.credential if @community.present?

        return unless @credential.present?
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
              "password": @credential.password,
              "username": @credential.username
            },
            "requestId": 15,
            "method": {
              "name": "getProperties",
              "version": "r1"
            }
          }.to_json
        end

        def get_property_ids_endpoint
          if @credential.entrata_url.include?('https://') || @credential.entrata_url.include?('http://')
            url = @credential.entrata_url
          else
            url = "https://#{@credential.entrata_url}.entrata.com/api/v1/properties"
          end
          url
        end

        def parse_properties_response response
          response["response"]["result"]["PhysicalProperty"]["Property"].map{|res| res["PropertyID"]} rescue []
        end

    end
  end
end
