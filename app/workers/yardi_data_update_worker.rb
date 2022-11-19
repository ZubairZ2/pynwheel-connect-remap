class YardiDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'yardi', retry: 3

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?

    credentials = community.credential.attributes.to_json
    
    if community&.credential&.url.include?("20")
      yardi2_service = Yardi2Service.new(JSON.parse(credentials))
      yardi2_service.perform    
    else 
      yardi4_service = Yardi4Service.new(JSON.parse(credentials))
      yardi4_service.perform
    end
  end
  
end