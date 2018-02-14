class Floorplan < ApplicationRecord
  mount_base64_uploader :image, AvatarUploader
  belongs_to :community
  has_many :amenities, as: :amenityable
  validates_uniqueness_of :name, scope: :community, on: :create
end
