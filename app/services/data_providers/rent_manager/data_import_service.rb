module DataProviders
  module RentManager
    class DataImportService < DataProviders::RentManager::BaseService

      def perform
        property_codes = @credential.rentmanager_property_id.split(',') rescue []
        property_codes.each do |property_code|
          begin
            import_property_details(property_code)
            import_property_floorplans(property_code)
            import_property_units(property_code)
          rescue => exception
            raise exception
          end 
        end
      end

      private

    end
  end
end