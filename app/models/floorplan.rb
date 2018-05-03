class Floorplan < ApplicationRecord
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  belongs_to :community
  has_many :amenities, as: :amenityable
  validates_uniqueness_of :name, scope: :community, on: :create
  validates_uniqueness_of :provider_floorplan_id, scope: :community
  after_commit :populate_image_urls

  def populate_image_urls
    if image.present?
      set_standard_url('Floorplan',id)
    end
  end
end
