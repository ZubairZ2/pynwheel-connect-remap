class EntrataDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'entrata', retry: 3

  def perform(community_id)
    community = Community.find_by_id community_id
    credentials = community.credential.attributes.to_json

    psi_service = PsiService.new(JSON.parse(credentials))
    psi_service.perform
  end
  
end