class YardirentcafeDataUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'yardi_rent_cafe', retry: 3

  def perform(community_id)
    community = Community.find_by_id community_id
    credentials = community.credential.attributes.to_json

    yardi_rent_cafe_service = YardiRentCafeService.new(JSON.parse(credentials))
    yardi_rent_cafe_service.perform
  end
  
end