require 'httparty'

module DataProviders
  module RentManager
    class BaseService
      TOKEN_CACHE_KEY = 'rent_manager_api_token'.freeze
      TOKEN_EXPIRY_THRESHOLD = 24.hours
      INACTIVITY_THRESHOLD = 15.minutes

      def initialize(community_id)
        @batch_size = 10
        @community_id = community_id
        @community = Community.find_by_id(community_id)
        @credential = @community&.credential if @community

        @api_auth_token = cached_api_token || generate_and_cache_api_token if valid_community?
      end

      def get_property_details(property_code)
        refresh_token_if_necessary
        fetch_property_details(property_code)
      end

      def get_units_list(property_code)
        refresh_token_if_necessary
        fetch_units_details(property_code)
      end

      def get_floorplans_list(property_code)
        refresh_token_if_necessary
        fetch_floorplans_details(property_code)
      end

      private

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

      def valid_community?
        @community && @credential
      end

      def fetch_authentication_token
        HTTParty.post(
          fetch_request_url('/Authentication/AuthorizeUser'),
          body: mandatory_params_to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
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
          'X-RM12Api-ApiToken' => @api_auth_token
        }
      end

      def username
        @credential.rentmanager_username
      end

      def password
        @credential.rentmanager_password
      end

      def location_id
        1
      end

      def cached_api_token
        Rails.cache.read(TOKEN_CACHE_KEY)
      end

      def generate_and_cache_api_token
        access_token = fetch_authentication_token
        access_token = JSON.parse(access_token.body)
        puts "\n\nAccess Token: #{access_token}\n\n"

        Rails.cache.write(TOKEN_CACHE_KEY, access_token, expires_in: TOKEN_EXPIRY_THRESHOLD)
        Rails.cache.write("#{TOKEN_CACHE_KEY}_expiry",(Time.now + TOKEN_EXPIRY_THRESHOLD), expires_in: TOKEN_EXPIRY_THRESHOLD)
        Rails.cache.write("#{TOKEN_CACHE_KEY}_inactivity", (Time.now + INACTIVITY_THRESHOLD), expires_in: INACTIVITY_THRESHOLD)

        access_token
      end

      def refresh_token_if_necessary
        if token_expired? || token_inactive?
          @api_auth_token = generate_and_cache_api_token
        else
          Rails.cache.write("#{TOKEN_CACHE_KEY}_inactivity", (Time.now + INACTIVITY_THRESHOLD), expires_in: INACTIVITY_THRESHOLD)
        end
      end

      def token_expired?
        token_expiry = Rails.cache.read("#{TOKEN_CACHE_KEY}_expiry")
        token_expiry.nil? || Time.now >= token_expiry
      end

      def token_inactive?
        last_activity = Rails.cache.read("#{TOKEN_CACHE_KEY}_inactivity")
        last_activity.nil? || Time.now >= last_activity
      end
    end
  end
end
