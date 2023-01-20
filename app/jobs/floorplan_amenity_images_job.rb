class FloorplanAmenityImagesJob < ApplicationJob
  include SuckerPunch::Job

  def perform floorplan, source, name, amenity, community_id
    if source == "True"
      amenities = floorplan
      amenities.each do |amenity|
        amenity.update!(x_plot: name, y_plot: amenity)
      end
    else
      floorplan_units = Unit.where(floorplan_id: floorplan.provider_floorplan_id, community_id: community_id)
      floorplan_units.each do |floorplan_unit|
        floorplan_unit.amenities.create!(image: source, name: name, floorplan_amenity_id: amenity.id)
      rescue => error
        puts error.inspect
      end
    end
  end
end
