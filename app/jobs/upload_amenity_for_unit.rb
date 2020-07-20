class UploadAmenityForUnit < ApplicationJob
    include SuckerPunch::Job
  
    def perform(community,ids, image_src, image_name)
      units = community.units.where(id: ids)
      units.each do |unit|
        unit.amenities.create(image: image_src,name: image_name)
      end
    end
  end
  