module DataProviders
  module RentManager
    module V1
      class BaseService
        def initialize(community_id)
          @batch_size = 10
          @community_id = community_id
          @community = Community.find_by_id(community_id)
          @credential = @community&.credential if @community
        end

        protected

          def get_property_details(property_code)
            DataProviders::RentManager::V1ApisService.new(@community_id).get_property_details(property_code)            
          end

          def get_units_list(property_code)
            DataProviders::RentManager::V1ApisService.new(@community_id).get_units_list(property_code)            
          end

          def get_floorplans_list(property_code)
            DataProviders::RentManager::V1ApisService.new(@community_id).get_floorplans_list(property_code)            
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
      end
    end
  end
end
