class HomeScreen < ApplicationRecord
	mount_uploader :appartments_button, AvatarUploader
	mount_uploader :galleries_button, AvatarUploader
	mount_uploader :neighborhood_button, AvatarUploader
	mount_uploader :favorities_button, AvatarUploader
	belongs_to :design
end
