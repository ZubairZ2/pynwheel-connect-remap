class FloorplanAmenitiesService
  def initialize floorplan, amenity, community
    @floorplan = floorplan
    @amenity = amenity
    @community = community

    @floorplan_units = (@floorplan.present? &&  @amenity&.amenityable_type&.downcase == "floorplan") ? Unit.where(floorplan_id: @floorplan.provider_floorplan_id, community_id: @community&.id) : []
  end

  def update_description_and_name
    @floorplan_units&.each do |floorplan_unit|
      floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id).update_all(directional_text: @amenity.directional_text, description: @amenity.description, name: @amenity.name)
    end
  end

  def update_image src
    @floorplan_units&.each do |floorplan_unit|
      floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id)&.first&.update!(image: src)
    end
  end

  def create_floorplan_amenity_galleries floorplan_amenity_gallery_image_id, params
    return unless floorplan_amenity_gallery_image_id.present?
    @floorplan_units&.each do |floorplan_unit|
      amenity = floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id).first
      AmenityGallery.create(name: params[:name], image: params[:src], amenity_id: amenity.id, associated_amenity_gallery_id: floorplan_amenity_gallery_image_id)
    end
  end

  def update_floorplan_amenity_gallery_info floorplan_amenity_gallery_image_id, params
    return unless floorplan_amenity_gallery_image_id.present?
    AmenityGallery.where(associated_amenity_gallery_id: floorplan_amenity_gallery_image_id).update_all(name: params[:name], description: params[:description])
  end

  def delete_floorplan_amenity_gallery floorplan_amenity_gallery_image_id
    return unless floorplan_amenity_gallery_image_id.present?
    AmenityGallery.where(associated_amenity_gallery_id: floorplan_amenity_gallery_image_id).destroy_all
  end

  def reset_plotting(svg_deletion = false)
    new_attributes = svg_deletion ? { pointer_data: {} } : { x_plot: 0, y_plot: 0 }
    @floorplan_units&.each do |floorplan_unit|
      floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id)&.update_all(new_attributes)
    end
  end

  def handle_amenity_sorting
    @floorplan_units&.each do |floorplan_unit|
      floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id).update_all(sort: @amenity.sort)
    end
  end
end