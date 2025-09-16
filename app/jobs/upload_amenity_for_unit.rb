class UploadAmenityForUnit < ApplicationJob
    include SuckerPunch::Job
  
    def perform(community,ids, image_src, image_name, mass_upload_id)
      units = community.units.where(id: ids)
      units.each do |unit|
        unit.amenities.create(image: image_src, name: image_name, mass_upload_id: mass_upload_id)
      end
    end
end
  