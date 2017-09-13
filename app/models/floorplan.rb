class Floorplan < ApplicationRecord
  mount_base64_uploader :image, AvatarUploader
  belongs_to :community
end
