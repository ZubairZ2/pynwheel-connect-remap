class GalleryImage < ApplicationRecord
	include RailsSortable::Model
  belongs_to :gallery
  set_sortable :sort  
	#mount_base64_uploader :image, GalleryUploader
	mount_uploader :image, GalleryUploader
	before_save :set_image_name
	before_save :populate_image_urls
	after_update :crop_image

	def crop_image
    image.recreate_versions! if crop_x.present?
  end

  def is_video?
		image.file.extension.downcase == 'mp4' 
	end

	def set_image_name
  	self.name = image.file.filename
  end

  def populate_image_urls
  	if self.image.present?
  		self.standard_image_url = self.image.url
  		self.large_image_url = self.image.url(:large)
  		self.ios_image_url = self.image.url(:ios)
  	end
  end
  
end
