class YardirentcafeDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'yardi_rent_cafe', retry: 3

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community&.credential.present?

    yardi_rent_cafe_service = YardiRentCafeService.new(community&.credential)
    yardi_rent_cafe_service.perform
  end
  
end
