class RentCafeDataImportWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'import_data', retry: 1

  def perform(community_id)
    return unless community_id.present?
    community = Community.find_by_id community_id

    if community&.credential&.rentcafe_api_version == "RentCafe V2"
      rent_cafe_data_import_service = DataProviders::RentCafe::V2::DataImportService.new(community_id)
    else
      rent_cafe_data_import_service = DataProviders::RentCafe::V1::DataImportService.new(community_id)
    end

    rent_cafe_data_import_service.perform
  end
end