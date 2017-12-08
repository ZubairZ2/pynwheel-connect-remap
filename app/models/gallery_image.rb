class GalleryImage < ApplicationRecord
	include RailsSortable::Model
  belongs_to :community
  set_sortable :sort  
	mount_base64_uploader :image, ImageUploader
	after_update :crop_image

	def crop_image
    image.recreate_versions! if crop_x.present?
  end
end
