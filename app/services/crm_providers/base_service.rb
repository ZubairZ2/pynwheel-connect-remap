module CrmProviders
  class BaseService
    def initialize community_id
      @community = Community.find community_id
      @credential = @community.credential
    end

    private

      def update_discovery_sources sources
        return unless sources.present?
        crm_discovery_source = @community.crm_discovery_source || @community.build_crm_discovery_source
        crm_discovery_source.update(sources: sources)
      end

      def update_time_slots time_slots
        return unless time_slots.present?
        crm_time_slot = @community.crm_time_slot || @community.build_crm_time_slot
        crm_time_slot.update(slots: time_slots)
      end
  end
end
