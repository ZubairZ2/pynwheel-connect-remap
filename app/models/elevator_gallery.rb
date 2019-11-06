class ElevatorGallery < ApplicationRecord
  belongs_to :elevator
  mount_base64_uploader :image, AvatarUploader
end
