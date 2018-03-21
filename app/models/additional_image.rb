class AdditionalImage < ApplicationRecord
	include RailsSortable::Model
  belongs_to :imagepage
  set_sortable :sort  
	mount_uploader :image, AvatarUploader
	before_save :set_image_name

	def set_image_name
  	self.name = image.file.filename
  end
end
