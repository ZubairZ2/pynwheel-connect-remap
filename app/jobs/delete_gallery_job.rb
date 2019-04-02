class DeleteGalleryJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(gallery)
    gallery.destroy
  end
end
