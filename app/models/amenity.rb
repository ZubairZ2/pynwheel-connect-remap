class Amenity < ApplicationRecord
	mount_uploader :image, AvatarUploader
	belongs_to :amenityable, polymorphic: true
	validates :image, :presence => {message: "can't be blank. Please upload amenity image first."}
end
