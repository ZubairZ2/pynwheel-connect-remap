class ResmanDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'resman', retry: 1

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?

    credentials = community.credential.attributes.to_json
    
    if community&.credential&.resman_api_version === "GetMarketing4_0"
      resman4_service = Resman4Service.new(community.credential)
      resman4_service.perform    
    else 
      resman_service = ResmanService.new(community.credential)
      resman_service.perform
    end
  end
  
end