class AmenityGallery < ApplicationRecord
  belongs_to :amenity
  mount_base64_uploader :image, AvatarUploader
end
