class UploadImageForUnit < ApplicationJob
  include SuckerPunch::Job

  def perform(community, ids, image)
    units = community.units.where(id: ids)

    units.each do |unit|
      unit.update(image: image, manually_updated: true)
    end
  end
end
