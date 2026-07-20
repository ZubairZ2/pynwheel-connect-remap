class YardiDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'yardi', retry: 1

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?

    credentials = community.credential.attributes.to_json
    
    if  community&.credential&.url.present?
      if community&.credential&.url.include?("20")
        yardi2_service = Yardi2Service.new(community.credential)
        yardi2_service.perform    
      else 
        yardi4_service = Yardi4Service.new(community.credential)
        yardi4_service.perform
      end
    end
  end
  
end