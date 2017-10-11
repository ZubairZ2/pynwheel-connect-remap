class HomePageImage < ApplicationRecord
	include RailsSortable::Model
    set_sortable :sort  
	mount_base64_uploader :image, AvatarUploader
	belongs_to :design
	after_update :crop_image

    def crop_image
      image.recreate_versions! if crop_x.present?
    end
end
