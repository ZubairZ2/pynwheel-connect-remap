class AmenityImagesJob < ApplicationJob
  include SuckerPunch::Job

  def perform community_id, source, amenity_name
    return unless community_id.present?
    begin
      community = Community.find_by_id community_id
      community.amenities.create(image: source, name: amenity_name, amenityable: community.sitemap)
    rescue => error
      puts "\ne.message\b" 
    end
  end
end
