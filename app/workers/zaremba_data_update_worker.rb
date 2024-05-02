class ZarembaDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'zaremba', retry: 3

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?
    
    zaremba_service = ZarembaService.new(community.credential)
    zaremba_service.perform
  end

end