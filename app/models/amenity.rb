class Amenity < ApplicationRecord
	mount_uploader :image, AvatarUploader
	belongs_to :amenityable, polymorphic: true
	validates :image, :presence => {message: "cannot be blank. Please upload Amenity image first."}
end
