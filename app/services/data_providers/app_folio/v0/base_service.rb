module DataProviders
  module AppFolio
    module V0
      class BaseService
        def initialize(community_id)
          begin
            @batch_size = 10
            @community_id = community_id
            @community = Community.find_by_id(community_id)
            @credential = @community&.credential if @community
            @app_folio_service = DataProviders::AppFolio::V0ApisService.new(@community_id)
          rescue =>  error
            false
          end
        end

        def get_resource(property_code, resource, filter_key)
          @app_folio_service.get_resource(property_code, resource, filter_key)            
        end

        protected
        
        def update_attribute_if_blank(object, attribute, value, diff_name = nil)
          updated_column = diff_name.present? ? diff_name : attribute
          object.send("#{attribute}=", value) if value.present? && !object.send("#{updated_column}_is_updated")
        end

        def import_units(units)
          return if units.empty?

          ProvidersDataUpdationService.new.update_or_create_units_records(units)
        end

      end
    end
  end
end