module Entrata
  # The single getUnitsAvailabilityAndPricing round trip behind both pricing
  # test buttons, with the timing logged so a slow page can be blamed on the
  # right half — Entrata's response or our own parsing.
  class PricingFetcher
    def initialize(credentials)
      @credentials = credentials
    end

    def fetch
      response = nil
      api_seconds = Benchmark.realtime do
        response = PsiService.call_entrata_api(
          subdomain: @credentials.entrata_url,
          endpoint: "propertyunits",
          method: :post,
          payload: {
            method: {
              name: "getUnitsAvailabilityAndPricing",
              params: {
                propertyId: property_id,
                availableUnitsOnly: @credentials&.entrata_available_units_only,
                showUnitSpaces: @credentials&.entrata_show_unit_spaces,
                useSpaceConfiguration: @credentials&.entrata_use_space_configuration
              }
            }
          }
        )
      end

      body = response.body
      hash = nil
      parse_seconds = Benchmark.realtime { hash = JSON.parse(body) }

      Rails.logger.info(
        "[Entrata::PricingFetcher] community=#{@credentials&.community_id} property=#{property_id} " \
        "bytes=#{body.bytesize} api=#{api_seconds.round(2)}s parse=#{parse_seconds.round(2)}s"
      )

      hash
    end

    private

    # property_id is stored as a comma separated list; the test buttons have
    # always sampled the first one.
    def property_id
      @property_id ||= @credentials.property_id.to_s.split(",").first
    end
  end
end
