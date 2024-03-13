module DataProviders
  module RentManager
    class V1ApisService
      def initialize(community_id)
        return unless community_id.present?

        @community = Community.find_by_id(community_id)
        @credential = @community&.credential if @community.present?
        @company = @community.company

        return unless @credential.present?
      end

      def get_property_details(property_code)
        fetch_property_details(property_code)
      end

      def get_units_list(property_code)
        fetch_units_details(property_code)
      end

      def get_floorplans_list(property_code)
        fetch_floorplans_details(property_code)
      end

      def generate_api_auth_token()
        fetch_authentication_token()
      end

      def de_auth_api_token
        de_authorize_token()
      end

      private

        def fetch_authentication_token
          response = HTTParty.post(
            fetch_request_url('/Authentication/AuthorizeUser'),
            body: mandatory_params_to_json,
            headers: { 'Content-Type' => 'application/json' }
          )
          update_company_token(response.success? ? JSON.parse(response.body) : nil)
        end

        def de_authorize_token
          response = HTTParty.post(
            fetch_request_url("/Authentication/Deauthorize?token=#{current_api_auth_token}"),
            body: mandatory_params_to_json,
            headers: { 'Content-Type' => 'application/json' }
          )

          update_company_token(response.success? ? JSON.parse(response.body) : nil)
        end

        def fetch_data(endpoint, params)
          HTTParty.get(
            fetch_request_url(endpoint),
            body: mandatory_params_to_json,
            headers: fetch_request_header
          )
        end

        def fetch_property_details(property_code)
          fetch_data("/properties/#{property_code}?embeds=#{get_property_embed_items}", nil)
        end

        def fetch_units_details(property_code)
          fetch_data("/units?embeds=#{get_units_embed_items}&filters=#{get_units_filter(property_code)}", nil)
        end

        def fetch_floorplans_details(property_code)
          fetch_data("/floorplans?embeds=#{get_floorplans_embed_items}&filters=#{get_floorplans_filter(property_code)}", nil)
        end

        def update_company_token token
          @company.update(rentmanager_auth_token: token)
        end

        def mandatory_params_to_json
          {
            Username: username,
            Password: password,
            LocationID: location_id
          }.to_json
        end

        def get_floorplans_filter(property_code)
          "PropertyID,eq,#{property_code}"
        end

        def get_floorplans_embed_items
          %w[FloorplanUnitTypes FloorplanUnitTypes.UnitTypes].join(',')
        end

        def get_units_filter(property_code)
          "PropertyID,eq,#{property_code}"
        end

        def get_units_embed_items
          [
            'CurrentMarketRent',
            'CurrentOccupancyStatus',
            'OccupancyStatusHistory',
            'CurrentOccupancyStatus.UnitStatus',
            'CurrentOccupants',
            'CurrentUnitStatus',
            'CurrentUnitStatus.UnitStatusType',
            'Floor',
            'IsVacant',
            'Leases',
            'MarketingSetup',
            'UnitType',
            'UnitStatuses',
            'UnitStatuses.UnitStatusType'
          ].join(',')
        end

        def get_property_embed_items
          %w[PrimaryAddress PrimaryPhoneNumber LogoFile].join(',')
        end

        def fetch_request_url(extended_url)
          "#{ENV['RENT_MANAGER_API_BASE_URL']}#{extended_url}"
        end

        def fetch_request_header
          {
            'Content-Type' => 'application/json',
            'X-RM12Api-ApiToken' => current_api_auth_token
          }
        end

        def username
          @credential.rentmanager_username
        end

        def password
          @credential.rentmanager_password
        end

        def current_api_auth_token
          @company.rentmanager_auth_token
        end

        def location_id
          1
        end

    end
  end
end
