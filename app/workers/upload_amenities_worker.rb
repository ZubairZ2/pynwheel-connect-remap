class UploadAmenitiesWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'create_amenity', retry: 3

  def perform(community_id, image_src, amenity_name)
    return unless community_id.present?
    community = Community.find_by_id community_id

    community.amenities.create(image: image_src, name: amenity_name)
  end
end