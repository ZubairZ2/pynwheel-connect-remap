class FloorplanAmenityGalleryJob < ApplicationJob
  include SuckerPunch::Job

  def perform(floorplan_id, amenity_id, community_id, floorplan_amenity_gallery_image_id, params)
    @floorplan = Floorplan.find_by_id floorplan_id
    @amenity = Amenity.find amenity_id
    @community = Community.find community_id
    create_floorplan_amenity_galley_images(floorplan_amenity_gallery_image_id, params)
  end

  private
  
  def create_floorplan_amenity_galley_images floorplan_amenity_gallery_image_id, params
    floorplan_units = get_list_of_floorplan_units()

    floorplan_units&.each do |floorplan_unit|
      amenity = floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id).first
      AmenityGallery.create(name: params[:name], image: params[:src], amenity_id: amenity.id, associated_amenity_gallery_id: floorplan_amenity_gallery_image_id)
    end
  end

  def get_list_of_floorplan_units
    if (@floorplan && @amenity && @community).present? && (@amenity&.amenityable_type&.downcase == "floorplan")
      Unit.where(floorplan_id: @floorplan.provider_floorplan_id, community_id: @community&.id)
    else
      []
    end
  end

end
