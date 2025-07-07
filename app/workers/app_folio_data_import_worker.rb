class AppFolioDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'import_data', retry: 3

  def perform(community_id)
    return unless community_id.present?
    community = Community.find_by_id community_id
    app_folio_service = DataProviders::AppFolio::V0::DataImportService.new(community.id)
    app_folio_service.perform
  end
end