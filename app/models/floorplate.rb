class Floorplate < ApplicationRecord
	mount_uploader :image, AvatarUploader
	belongs_to :community
	validates_uniqueness_of :name
end
