module DataProviders
  module RealPage
    module V1
      class TestConnectionService < DataProviders::RealPage::V1::BaseService
        def perform
          begin
            DataProviders::RealPage::V1ApisService.new(@community.id).fetch_units_data(@site_ids[0])
          rescue
            false
          end
        end
      end
    end
  end
end
