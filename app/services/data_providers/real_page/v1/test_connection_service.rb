module DataProviders
  module RealPage
    module V1
      class TestConnectionService < DataProviders::RealPage::V1::BaseService
        def perform
          begin
            response = DataProviders::RealPage::V1ApisService.new(@community.id).fetch_units_data(@site_ids[0])
            response.body
          rescue
            false
          end
        end

        def test_mandatory_fees
          begin
            unit = @community.units.first
            return false unless unit.present?

            unit_id = unit.provider_unit_id.to_s.split("-").first
            response = DataProviders::RealPage::V1ApisService.new(@community.id).fetch_mandatory_fees(@site_ids[0], unit_id)
            response.body
          rescue
            false
          end
        end
      end
    end
  end
end
