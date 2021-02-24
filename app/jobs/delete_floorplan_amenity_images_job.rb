class DeleteFloorplanAmenityImagesJob < ApplicationJob
  # queue_as :default
  include SuckerPunch::Job
  def perform(floorplan,amenity, community_id)
    floorplan_units = Unit.all.where(floorplan_id: floorplan.provider_floorplan_id,community_id: community_id) rescue nil
    floorplan_units.each do |floorplan_unit|
      @floorplan_unit_amenity = floorplan_unit.amenities.where(floorplan_amenity_id: amenity.id).first rescue nil
      if @floorplan_unit_amenity.present?
        @floorplan_unit_amenity.destroy
      end
    end
  end
end