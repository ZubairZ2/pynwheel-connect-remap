module DataProviders
  module RealPage
    module V1
      class TestConnectionService < DataProviders::RealPage::V1::BaseService
        def perform
          begin
            property_code = @credential&.p_code&.split(",")[0] rescue ""
            property_code = property_code&.strip

            DataProviders::RealPage::V1ApisService.new(@community_id).get_apartment_availability(property_code) if property_code.present?
            
          rescue
            false
          end
        end
      end
    end
  end
end
