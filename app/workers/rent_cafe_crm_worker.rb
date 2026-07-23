class RentCafeCrmWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'crm', retry: 1

  def perform(community_id)
    return unless community_id.present?

    rent_cafe_crm_service =  CrmProviders::RentCafeService.new(community_id)
    rent_cafe_crm_service.update_property_crm_data
  end
end