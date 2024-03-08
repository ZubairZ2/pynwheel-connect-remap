require 'httparty'

module DataProviders
  module RentManager
    class BaseService

      def initialize(community_id)
        @batch_size = 10
        @community_id = community_id
        @community = Community.find_by_id(community_id)
        @credential = @community&.credential if @community
        @api_auth_token = nil 
        # @api_auth_token = generate_api_token if valid_community?
      end

      def get_property_details property_code
        fetch_property_details(property_code)
      end

      def get_units_list property_code
        fetch_units_details(property_code)
      end

      def get_floorplans_list property_code
        fetch_floorplans_details(property_code)
      end

      private

        def update_attribute_if_blank(object, attribute, value, diff_name = nil)
          updatedColumn = diff_name.present? ? diff_name : attribute
          object.send("#{attribute}=", value) if value.present? && !object.send("#{updatedColumn}_is_updated")
        end

        def import_floorplans(floorplans)
          return if floorplans.empty?
          ProvidersDataUpdationService.new().update_or_create_floorplans_records(floorplans)
        end

        def import_units(units)
          return if units.empty?
          ProvidersDataUpdationService.new().update_or_create_units_records(units)
        end

        def valid_community?
          @community && @credential
        end

        def fetch_authentication_token
          "\n\n\n\n API Token Created \n\n\n\n"

          @api_auth_token ||= HTTParty.post(
            fetch_request_url("/Authentication/AuthorizeUser"),
            body: mandatory_params_to_json,
            headers: { 'Content-Type' => 'application/json' }
          )
        end

        def fetch_data(endpoint, params)
          response = HTTParty.get(
            fetch_request_url(endpoint),
            body: mandatory_params_to_json,
            headers: fetch_request_header
          )
          
          if response.present? && response.success?
            response
          else
            @api_auth_token = nil
            fetch_authentication_token
            fetch_data(endpoint, params)
          end
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

        def get_floorplans_filter property_code
          "PropertyID,eq,#{property_code}"
        end

        def get_floorplans_embed_items
          ["FloorplanUnitTypes","FloorplanUnitTypes.UnitTypes"].join(",")
        end

        def get_units_filter property_code
          "PropertyID,eq,#{property_code}"
        end

        def get_units_embed_items
          [
            "CurrentMarketRent",
            "CurrentOccupancyStatus",
            "OccupancyStatusHistory",
            "CurrentOccupancyStatus.UnitStatus",
            "CurrentOccupants",
            "CurrentUnitStatus",
            "CurrentUnitStatus.UnitStatusType",
            "Floor",
            "IsVacant",
            "Leases",
            "MarketingSetup",
            "UnitType",
            "UnitStatuses",
            "UnitStatuses.UnitStatusType"
          ].join(",")
        end

        def get_property_embed_items
          ["PrimaryAddress","PrimaryPhoneNumber","LogoFile"].join(",")
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
          @credential.rentmanager_username
        end

        def password
          @credential.rentmanager_password
        end

        def location_id
          1
        end
    end
  end
end
