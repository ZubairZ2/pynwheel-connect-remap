class EntrataDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'import_data', retry: 1

  def perform(community_id)
    return unless community_id.present?
    community = Community.find_by_id community_id

    psi_static_service = PsiStaticService.new(community&.credential)
    psi_static_service.perform
  end
end