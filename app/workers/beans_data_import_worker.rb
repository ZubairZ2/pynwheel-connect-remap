class BeansDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'apartmentlist', retry: 3

  def perform(community_id)
    return unless community_id.present?
    community = Community.find_by_id community_id
    return if community&.credential&.apartmentlist_url.blank?

    beans_service = DataProviders::Beans::DataImportService.new(community.id)
    beans_service.perform
  end
end