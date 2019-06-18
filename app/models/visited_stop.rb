class VisitedStop < ApplicationRecord
  belongs_to :tour_user
  mount_uploader :image, AvatarUploader
end
