module CrmProviders
  class FunnelCrmService < CrmProviders::BaseService

    def update_property_crm_data
      fetch_discovery_sources
      fetch_available_slots
    end

    private
      def fetch_discovery_sources
        sources = FunnelService.new(@community).get_discovery_sources
        update_discovery_sources(sources)
      end

      def fetch_available_slots
        available_slots = FunnelService.new(@community).available_slots
        update_time_slots(available_slots)
      end
  end
end
