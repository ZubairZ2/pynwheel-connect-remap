class FloorplanAmenityImagesJob < ApplicationJob
  # queue_as :default
  include SuckerPunch::Job

  def perform(floorplan, source, name, amenity, community_id)
    if source == "True"
      x_crop = name
      y_crop = amenity
      amenities = floorplan
      amenities.each do |amenity|
        amenity.update!(x_plot: x_crop, y_plot: y_crop)
      end
    else
      floorplan_units = Unit.all.where(floorplan_id: floorplan.provider_floorplan_id, community_id: community_id) rescue nil
      floorplan_units.each do |floorplan_unit|
        
        begin
          puts "\n\n\n\n -------------------------------------"
          puts success
          puts "\n\n\n\n -------------------------------------"

          floorplan_unit.amenities.create!(image: source, name: name, floorplan_amenity_id: amenity.id)
        rescue => error
          puts "\n\n\n\n -------------------------------------"
          puts error.inspect
          puts "\n\n\n\n -------------------------------------"
        end

      end
    end
  end
end
