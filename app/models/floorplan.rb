class Floorplan < ApplicationRecord
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :secondary_image, AvatarUploader
  belongs_to :community
  has_many :amenities, as: :amenityable
  validates_uniqueness_of :name, scope: :community, on: :create
  validates_uniqueness_of :provider_floorplan_id, scope: :community
  after_commit :populate_image_urls, on: [:create,:update]
  validates :market_rent, :numericality => { greater_than_or_equal_to: -1 }
  after_update :crop_image
  after_update :crop_secondary_image

  def populate_image_urls
    if image.present?
      set_standard_url('Floorplan',id)
    end
  end

  def crop_secondary_image
    secondary_image.recreate_versions! if (crop_x_secondary.present? && !image_bit && do_crop_secondary)
  end

  def crop_image
    image.recreate_versions! if (crop_x.present? && image_bit && do_crop)
  end

end
