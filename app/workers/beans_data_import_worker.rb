class BeansDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'import_data', retry: 3

  def perform(community_id)
    return unless community_id.present?
    community = Community.find_by_id community_id

    beans_service = DataProviders::Beans::DataImportService.new(community.id)
    beans_service.perform
  end
end