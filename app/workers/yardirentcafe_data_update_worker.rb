class YardirentcafeDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'yardi_rent_cafe', retry: 1

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?

    if community&.credential.rentcafe_api_version == "RentCafe V2"
      yardi_rent_cafe_service = YardiRentCafeV2Service.new(community&.credential)
    else
      yardi_rent_cafe_service = YardiRentCafeService.new(community&.credential)
    end

    yardi_rent_cafe_service.perform
  end
  
end
