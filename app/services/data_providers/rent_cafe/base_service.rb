module DataProviders
  module RentCafe
    class BaseService

      def initialize(community_id)
        return unless community_id.present?
        @community_id = community_id
        @community = Community.find_by_id community_id
        @credential = @community.credential
        @batch_size = 10
        return unless (@community.present? || @credential.present?)
      end

      protected

        def api_token
          @credential.api_token
        end

        def company_code
          @credential.c_code
        end

        def update_property_details()
          DataProviders::RentCafe::PropertyDetailsService.new(@community_id).perform()
        end

        def get_appartments_availability property_code
          RentCafeApiV2Service.new(@community_id).get_apartment_availability(property_code)
        end

        def get_apartment_pricing_details property_code, apartment_name
          RentCafeApiV2Service.new(@community_id).get_apartment_pricing_matrix(apartment_name, property_code)
        end

        def get_floorplan_details property_code
          RentCafeApiV2Service.new(@community_id).get_floorplans(property_code)
        end

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

        def evaluate_floor(marketing_name)
          marketing_name = marketing_name.gsub('-','')
          floor = 1
          
          if marketing_name.size == 3
            floor = marketing_name.first(1)
          elsif marketing_name.size > 3
            floor = marketing_name.first(2)
          end

          return floor 
        end
    end
  end
end
