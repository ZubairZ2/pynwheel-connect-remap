class FloorplanAmenitiesService
  def initialize floorplan, amenity, community
    @floorplan = floorplan
    @amenity = amenity
    @community = community

    @floorplan_units = Unit.where(floorplan_id: @floorplan.provider_floorplan_id, community_id: @community&.id)
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

  def create_floorplan_amenity_galleries params
    @floorplan_units&.each do |floorplan_unit|
      amenity = floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id).first
      AmenityGallery.create(name: params[:name], image: params[:src], amenity_id: amenity.id)
    end
  end

  def update_floorplan_amenity_gallery_info gallery_id, params
    binding.pry
    # @floorplan_units&.each do |floorplan_unit|
    #   amenity = floorplan_unit&.amenities&.where(floorplan_amenity_id: @amenity.id).first
    #   amenity&.amenity_galleries&.where(galler_id: gallery_id)&.first.&update_attributes(params)
    # end
  end

  def delete_floorplan_amenity_gallery

  end

end