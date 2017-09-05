class Floorplan < ApplicationRecord
  mount_uploader :file_url, AvatarUploader
  belongs_to :community
end
