# Bulk counterpart of the floor plan change on the unit edit page: after the
# units have been pointed at the new floor plan, every unit's floor plan derived
# amenities are dropped and recreated from the newly assigned floor plan, the
# same way UnitsController#update does it for a single unit through
# AssignFloorplanImagesToUnitJob.
class AssignFloorplanToUnitsJob < ApplicationJob
  include SuckerPunch::Job

  def perform(community_id, unit_ids, floorplan_id)
    floorplan = Floorplan.find_by(id: floorplan_id, community_id: community_id)
    return if floorplan.blank?

    floorplan_amenities = floorplan.amenities.to_a

    Unit.where(id: unit_ids, community_id: community_id).find_each do |unit|
      unit.amenities.where.not(floorplan_amenity_id: nil).delete_all

      floorplan_amenities.each do |floorplan_amenity|
        unit.amenities.create!(
          provider_amenity_id: floorplan_amenity.provider_amenity_id,
          amenty_type: floorplan_amenity.amenty_type,
          description: floorplan_amenity.description,
          unit_id: unit.id,
          name: floorplan_amenity.name,
          image: floorplan_amenity.image,
          x_plot: floorplan_amenity.x_plot,
          y_plot: floorplan_amenity.y_plot,
          amenityable_type: "Unit",
          amenityable_id: unit.id,
          community_id: floorplan_amenity.community_id,
          standard_image_url: floorplan_amenity.standard_image_url,
          floorplan_amenity_id: floorplan_amenity.id
        )
      end
    end
  end
end
