class FunnelCrmWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'crm', retry: 3

  def perform(community_id)
    return unless community_id.present?

    funnel_crm_service =  CrmProviders::FunnelCrmService.new(community_id)
    funnel_crm_service.update_property_crm_data
  end
end