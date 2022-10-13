class AssignFloorplanImagesToUnitJob < ApplicationJob
  # queue_as :default
  include SuckerPunch::Job

  def perform(floorplan_amenities, add_floorplan_amenities, unit)
    @unit = unit
    if add_floorplan_amenities == "edit"
      floorplan_amenities.each do |floorplan_amenity|
        @unit.amenities.create!(provider_amenity_id: floorplan_amenity.provider_amenity_id, amenty_type: floorplan_amenity.amenty_type, description: floorplan_amenity.description, unit_id: @unit.id, name: floorplan_amenity.name, image: floorplan_amenity.image, x_plot: floorplan_amenity.x_plot, y_plot: floorplan_amenity.y_plot, amenityable_type: "Unit", amenityable_id: @unit.id, community_id: floorplan_amenity.community_id, standard_image_url: floorplan_amenity.standard_image_url, floorplan_amenity_id: floorplan_amenity.id)
      end
    end
    if add_floorplan_amenities == "true"
      floorplan_amenities.each do |floorplan_amenity|
        @unit.amenities.create!(provider_amenity_id: floorplan_amenity.provider_amenity_id, amenty_type: floorplan_amenity.amenty_type, description: floorplan_amenity.description, unit_id: @unit.id, name: floorplan_amenity.name, image: floorplan_amenity.image, x_plot: floorplan_amenity.x_plot, y_plot: floorplan_amenity.y_plot, amenityable_type: "Unit", amenityable_id: @unit.id, community_id: floorplan_amenity.community_id, standard_image_url: floorplan_amenity.standard_image_url, floorplan_amenity_id: floorplan_amenity.id)
      end
    end
    if add_floorplan_amenities == "delete previous"
      floorplan_amenities.delete_all
    end
  end
end
