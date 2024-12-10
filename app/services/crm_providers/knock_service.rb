module CrmProviders
  class KnockService < CrmProviders::BaseService

    def update_property_crm_data
      property_code = @credential.p_code.split(',')[0]
      fetch_discovery_sources(property_code)
      fetch_time_slots(property_code)
    end

    private

      def fetch_discovery_sources property_code
        sources = DataProviders::RentCafe::V2ApisService.new(@community.id).get_discovery_sources(property_code)
        update_discovery_sources(sources)
      end

      def fetch_time_slots property_code
        time_slots = DataProviders::RentCafe::V2ApisService.new(@community.id).get_available_slots(property_code)
        update_time_slots(time_slots)
      end
  end
end
