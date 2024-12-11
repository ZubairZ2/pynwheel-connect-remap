module CrmProviders
  class KnockCrmService < CrmProviders::BaseService

    def update_property_crm_data
      fetch_discovery_sources
      fetch_time_slots
    end

    private

      def fetch_discovery_sources
        sources = KnockService.new(@community).get_discovery_sources
        update_discovery_sources(sources)
      end

      def fetch_time_slots
        time_slots = KnockService.new(@community).available_slots
        update_time_slots(time_slots)
      end
  end
end
