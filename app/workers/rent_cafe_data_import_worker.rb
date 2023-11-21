class RentCafeDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'import_data', retry: 3

  def perform(community_id)
    begin
      rent_cafe_data_import_service = DataProviders::RentCafe::V2::DataImportService.new(community_id)
      rent_cafe_data_import_service.perform
    rescue => exception
      raise exception
    end
  end
end