class PlotAmenityForUnit < ApplicationJob
    include SuckerPunch::Job
  
    def perform(amenity, unit_id, x_plot, y_plot)
        amenities = Amenity.where('id != ? AND mass_upload_id = ?', amenity.id, amenity.mass_upload_id)
        amenities.each do |amnty|
            amnty.x_plot = x_plot
            amnty.y_plot = y_plot
            amnty.save(validate: false)
        end
    end
end
  