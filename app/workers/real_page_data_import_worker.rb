class RealPageDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'import_data', retry: 1

  def perform community_id
    rp_import_service = DataProviders::RealPage::V1::ImportService.new(community_id)
    rp_import_service.perform
  end
end