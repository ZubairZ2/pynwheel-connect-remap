class RealPageDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'real_page', retry: 1

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?
    
    real_page_svc_service = RealPageSvcService.new(community.credential)
    real_page_svc_service.perform
  end
  
end