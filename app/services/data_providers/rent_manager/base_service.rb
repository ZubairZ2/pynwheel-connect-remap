require 'httparty'

module DataProviders
  module RentManager
    class BaseService
      BATCH_SIZE = 10

      def initialize(community_id)
        @community_id = community_id
        @community = Community.find_by_id(community_id)
        @credential = @community&.credential if @community
        @api_auth_token = generate_api_token if valid_community?
      end

      def get_properties_list
        fetch_properties_details
      end

      def get_units_list
        fetch_units_details
      end

      private

        def valid_community?
          @community && @credential
        end

        def generate_api_token
          fetch_authentication_token
        end

        def fetch_authentication_token
          HTTParty.post(
            fetch_request_url("/Authentication/AuthorizeUser"),
            body: mandatory_params_to_json,
            headers: { 'Content-Type' => 'application/json' }
          )
        end

        def fetch_properties_details
          HTTParty.get(
            fetch_request_url("/properties"),
            body: mandatory_params_to_json,
            headers: fetch_request_header
          )
        end

        def fetch_units_details
          HTTParty.get(
            fetch_request_url("/units"),
            body: mandatory_params_to_json,
            headers: fetch_request_header
          )
        end

        def mandatory_params_to_json
          {
            Username: username,
            Password: password,
            LocationID: location_id
          }.to_json
        end

        def fetch_request_url(extended_url)
          "#{ENV["RENT_MANAGER_API_BASE_URL"]}#{extended_url}"
        end

        def fetch_request_header
          { 
            'Content-Type' => 'application/json',
            'X-RM12Api-ApiToken' => @api_auth_token
          }
        end

        def username
          ENV['RENT_MANAGER_USERNAME']
        end

        def password
          ENV['RENT_MANAGER_PASSWORD']
        end

        def location_id
          1
        end

        def property_id
          1
        end
    end
  end
end
