class FloorplanAmenitiesService
  def initialize
  end

  def update_description_and_name floorplan, amenity, community_id
    floorplan_units = Unit.all.where(floorplan_id: floorplan.provider_floorplan_id, community_id: community_id) rescue nil
    floorplan_units.each do |floorplan_unit|
      @floorplan_unit_amenities = floorplan_unit.amenities.where(floorplan_amenity_id: amenity.id)

      if @floorplan_unit_amenities.present?
        @floorplan_unit_amenities.update_all(description: amenity.description, name: amenity.name)
      end
    end

  end


end