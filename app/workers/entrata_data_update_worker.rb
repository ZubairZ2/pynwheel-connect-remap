class EntrataDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'entrata', retry: 1

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?
    
    psi_service = PsiService.new(community.credential)
    psi_service.perform
  end
  
end