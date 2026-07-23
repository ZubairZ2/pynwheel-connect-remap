class RentManagerDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'import_data', retry: 1

  def perform(community_id)
    return unless community_id.present?
    community = Community.find_by_id community_id
    rent_manager_service = DataProviders::RentManager::V1::DataImportService.new(community.id)
    rent_manager_service.perform
  end
end