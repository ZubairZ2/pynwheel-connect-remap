class HomeScreen < ApplicationRecord
	mount_base64_uploader :appartments_button, AvatarUploader
	mount_base64_uploader :galleries_button, AvatarUploader
	mount_base64_uploader :neighborhood_button, AvatarUploader
	mount_base64_uploader :favorities_button, AvatarUploader
	mount_base64_uploader :about_button, AvatarUploader
	mount_base64_uploader :floorplan_button, AvatarUploader
	belongs_to :design
end
