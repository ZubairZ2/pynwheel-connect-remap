class UploadImageForUnit < ApplicationJob
  include SuckerPunch::Job

  def perform(community,ids, image)
    # byebug
    # community.units.where(id: ids).update_all(image: image,manually_updated: true)
    units = community.units.where(id: ids)
    units.each do |unit|
      units.update(image: image,manually_updated: true)
    end
    # flash[:notice] = "Image is uploaded for units successfully."

  end
end
