class UploadAmenitiesWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'amenity_image', retry: 3

  def perform(community_id, image_src, amenity_name)
    return unless community_id.present?
    community = Community.find_by_id community_id

    begin
      community.amenities.create(image: image_src, name: amenity_name)
    rescue => e
      raise e
    end
  end
end