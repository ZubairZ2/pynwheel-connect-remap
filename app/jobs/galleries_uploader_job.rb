class GalleriesUploaderJob < ApplicationJob
  include SuckerPunch::Job

  def perform params, community, current_pynwheel_user
    GalleriesUploaderService.new(community, current_pynwheel_user).upload_galleries_images(params)
  end
end