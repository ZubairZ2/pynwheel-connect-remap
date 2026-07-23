class RealPageMarketingSourcesWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'marketing_sources', retry: 1

  def perform(community_id)
    return unless community_id.present?

    real_page_get_leasing_agents_service = RealPageGetMarketingSourcesService.new(community_id)
    real_page_get_leasing_agents_service.perform
  end
  
end