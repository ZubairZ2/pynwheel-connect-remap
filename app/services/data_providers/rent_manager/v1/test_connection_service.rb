module DataProviders
  module RentManager
    module V1
      class TestConnectionService < DataProviders::RentManager::V1::BaseService
        def perform
          begin
            property_code = @credential&.rentmanager_property_id&.split(",")[0] rescue ""
            property_code = property_code&.strip

             if property_code.present?
              {
                "Property Details": get_property_details(property_code),
                "Floorplans": get_floorplans_list(property_code),
                "Units": get_units_list(property_code) 
              }
            end

          rescue
            false
          end
        end
      end
    end
  end
end