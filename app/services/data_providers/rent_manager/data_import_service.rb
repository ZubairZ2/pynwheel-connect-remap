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

        def import_property_details property_code
          response = get_property_details(property_code)
          return unless response.present?
          update_property_details(response)
        end

        def update_property_details details
          @community.update!(
            name: details["Name"],
            address: details["PrimaryAddress"]["Street"],
            city: details["PrimaryAddress"]["City"],
            state: details["PrimaryAddress"]["State"],
            zip: details["PrimaryAddress"]["PostalCode"],
            email: details["Email"],
            phone: details["PrimaryPhoneNumber"]["PhoneNumber"]
          )
        end

        def import_property_floorplans property_codes

        end

        def import_property_units property_codes
        end

    end
  end
end