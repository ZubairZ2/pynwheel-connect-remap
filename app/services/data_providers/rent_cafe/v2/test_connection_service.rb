module DataProviders
  module RentCafe
    module V2
      class TestConnectionService < DataProviders::RentCafe::V2::BaseService
        def perform
          begin
            property_code = @credential&.p_code&.split(",")[0] rescue ""
            property_code = property_code&.strip
            RentCafeApiV2Service.new(@community_id).get_apartment_availability(property_code) if property_code.present?
          rescue
            false
          end
        end
      end
    end
  end
end
