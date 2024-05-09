module DataProviders
  module RentCafe
    module V2
      class TestConnectionService < DataProviders::RentCafe::V2::BaseService
        def perform
          begin
            property_code = @credential&.p_code&.split(",")[0] rescue ""
            property_code = property_code&.strip
            rent_cafe_v2_service = DataProviders::RentCafe::V2ApisService.new(@community_id)
            floorplans = rent_cafe_v2_service.get_floorplans(property_code) if property_code.present?
            units = rent_cafe_v2_service.get_apartment_availability(property_code) if property_code.present?
            {floorplans: floorplans, units: units}
          rescue
            false
          end
        end
      end
    end
  end
end
