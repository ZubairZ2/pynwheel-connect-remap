class Amenity < ApplicationRecord
	mount_base64_uploader :image, AvatarUploader
	belongs_to :amenityable, polymorphic: true
	belongs_to :community
	validates :image, :presence => {message: "cannot be blank. Please upload Amenity image first."}
end
