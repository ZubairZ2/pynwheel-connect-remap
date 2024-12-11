class KnockCrmWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'crm', retry: 3

  def perform(community_id)
    return unless community_id.present?

    knock_crm_service =  CrmProviders::KnockService.new(community_id)
    knock_crm_service.update_property_crm_data
  end
end