require 'httparty'

module DataProviders
  module RentManager
    class BaseService

      def initialize(community_id)
        @batch_size = 10
        @community_id = community_id
        @community = Community.find_by_id(community_id)
        @credential = @community&.credential if @community
        @company = @community.company
      end

      protected
      
        def get_property_details(property_code)
          return unless is_user_authorized?
          fetch_property_details(property_code)
        end

        def get_units_list(property_code)
          return unless is_user_authorized?
          fetch_units_details(property_code)
        end

        def get_floorplans_list(property_code)
          return unless is_user_authorized?
          fetch_floorplans_details(property_code)
        end

        def is_user_authorized?
          begin
            if (token_expired? || token_inactive?)
              return renew_token
            else
              @company.update(rentmanager_token_inactivity: (current_time + 15.minutes))
              return true
            end
          rescue
            return false
          end
        end

        def token_inactive?
          @company&.rentmanager_token_inactivity.nil? || current_time >= @company&.rentmanager_token_inactivity&.to_datetime
        end

        def token_expired?
          @company&.rentmanager_auth_token.nil? || current_time >= @company&.rentmanager_token_expiry&.to_datetime
        end

        def renew_token
          access_token = fetch_authentication_token()
          return false unless access_token.present?
          
          @company.update(
            rentmanager_auth_token: access_token, 
            rentmanager_token_expiry: (current_time + 1.day),
            rentmanager_token_inactivity: (current_time + 15.minutes)
          )

          return true
        end

        def current_time
          Time.now.utc.to_datetime
        end

        def update_attribute_if_blank(object, attribute, value, diff_name = nil)
          updated_column = diff_name.present? ? diff_name : attribute
          object.send("#{attribute}=", value) if value.present? && !object.send("#{updated_column}_is_updated")
        end

        def import_floorplans(floorplans)
          return if floorplans.empty?

          ProvidersDataUpdationService.new.update_or_create_floorplans_records(floorplans)
        end

        def import_units(units)
          return if units.empty?

          ProvidersDataUpdationService.new.update_or_create_units_records(units)
        end

        def fetch_authentication_token
          response = HTTParty.post(
            fetch_request_url('/Authentication/AuthorizeUser'),
            body: mandatory_params_to_json,
            headers: { 'Content-Type' => 'application/json' }
          )

          response.success? ? JSON.parse(response.body) : nil
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
            'X-RM12Api-ApiToken' => api_auth_token()
          }
        end

        def username
          @credential.rentmanager_username
        end

        def password
          @credential.rentmanager_password
        end

        def api_auth_token
          @company.rentmanager_auth_token
        end

        def location_id
          1
        end
    end
  end
end
