class Floorplate < ApplicationRecord
	mount_uploader :image, AvatarUploader
	belongs_to :community
end
