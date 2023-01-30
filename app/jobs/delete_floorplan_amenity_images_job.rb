class DeleteFloorplanAmenityImagesJob < ApplicationJob
  include SuckerPunch::Job

  def perform floorplan, amenity, community_id
    floorplan_units = Unit.where(floorplan_id: floorplan.provider_floorplan_id, community_id: community_id)
    floorplan_units.includes(:amenities).each do |floorplan_unit|
      floorplan_unit.amenities.where(floorplan_amenity_id: amenity.id).destroy_all
    end
  end
end