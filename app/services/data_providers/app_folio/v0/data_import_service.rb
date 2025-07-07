module DataProviders
  module AppFolio
    module V0
      class DataImportService < DataProviders::AppFolio::V0::BaseService

        def perform
          property_codes = @credential.app_folio_property_id.split(',') rescue []

          property_codes.each do |property_code|
            begin
              property_code = property_code&.strip

              # import_property_details(property_code)
              # import_property_floorplans(property_code)
              # import_property_units(property_code)
              # update_floorplan_square_footage()

            rescue => exception
              raise exception
            end
          end
        end

        private

        def import_property_details property_code
          response = get_resource(property_code, "properties")
          return unless response.present?
          update_property_details(response)
        end

        def update_property_details details
          return unless details.present?
          details = details["data"]

          return unless details.present?
          details = details.is_a?(Array) ? details.first : details

          @community.update!(
            name: details["Name"],
            address: details["Address1"] ||  details["Address2"],
            city: details["City"],
            state: details["State"],
            zip: details["Zip"],
            # email: details["Email"],
            # website: details["Link"],
            # phone: details["PhoneNumber"]
          )
        end

      end
    end
  end
end