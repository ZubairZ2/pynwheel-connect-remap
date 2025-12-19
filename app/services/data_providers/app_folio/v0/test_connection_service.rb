module DataProviders
  module AppFolio
    module V0
      class TestConnectionService < DataProviders::AppFolio::V0::BaseService
        def perform
          property_ids = @credential&.resolved_app_folio_property_ids(@app_folio_service)
          return [] if property_ids.blank?

          get_resource(property_ids.first&.strip, "units", "PropertyId")
        rescue
          false
        end
      end
    end
  end
end