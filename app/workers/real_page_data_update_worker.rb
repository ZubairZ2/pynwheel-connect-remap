class RealPageDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'real_page', retry: 3

  def perform(community_id)
    community = Community.find_by_id community_id
    credentials = community.credential.attributes.to_json

    real_page_svc_service = RealPageSvcService.new(JSON.parse(credentials))
    real_page_svc_service.perform
  end
  
end