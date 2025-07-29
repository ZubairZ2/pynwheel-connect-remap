module DataProviders
  module AppFolio
    module V0
      class TestConnectionService < DataProviders::AppFolio::V0::BaseService
        def perform
          begin
            property_code = @credential&.app_folio_property_id&.split(",")[0] rescue ""
            property_code = property_code&.strip
            return false unless property_code.present?
            get_resource(property_code, "units", "PropertyId")
          rescue
            false
          end
        end
      end
    end
  end
end