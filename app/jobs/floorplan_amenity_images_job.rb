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
          floorplan_unit.amenities.create!(image: source, name: name, floorplan_amenity_id: amenity.id)
          puts "\n\n\n---------------------------- Unit amenity adding success -------------------------------\n\n\n"
        rescue => error
          puts "\n\n\n---------------------------- Unit amenity adding error -------------------------------"
          puts error.inspect
          puts "\n\n\n---------------------------- Unit amenity adding error -------------------------------"
        end
      end
    end
  end
end
