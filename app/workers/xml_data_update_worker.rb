class XmlDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'xml', retry: 1

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?
    
    xml_service = XmlService.new(community.credential)
    xml_service.perform
  end

end