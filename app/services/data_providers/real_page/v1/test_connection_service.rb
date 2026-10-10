module DataProviders
  module RealPage
    module V1
      class TestConnectionService < DataProviders::RealPage::V1::BaseService
        def perform
          begin
            response = DataProviders::RealPage::V1ApisService.new(@community.id).fetch_units_data(@site_ids[0])
            usable_body(response)
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
            usable_body(response)
          rescue
            false
          end
        end

        private

        # RealPage answers a rejected request with HTTP 200 and a SOAP Fault in
        # the body, so returning the body unchecked made every failure look like
        # a pass: the settings page rendered the fault XML and the admin read it
        # as "connection works" while nothing could actually import. That is how
        # Cypress Terra kept testing green while importing nothing.
        #
        # TestConnectionWorker treats nil/false as its failure signal, so fold
        # faults into that and leave the detail in the log.
        def usable_body(response)
          body = response&.body
          return false if body.blank?

          if DataProviders::RealPage::Integration.fault?(body)
            fault = body[/<faultstring[^>]*>(.*?)<\/faultstring>/m, 1]
            Rails.logger.error(
              "[RealPage::TestConnection] community=#{@community.id} site=#{@site_ids&.first} fault=#{fault}"
            )
            return false
          end

          body
        end
      end
    end
  end
end
