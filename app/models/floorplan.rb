class Floorplan < ApplicationRecord
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :secondary_image, AvatarUploader
  mount_base64_uploader :file, DesignUploader
  belongs_to :community
  has_many :amenities, as: :amenityable
  has_one :status, as: :statusable
  # validates_uniqueness_of :name, scope: :community, on: [:create, :update]
  validates_uniqueness_of :provider_floorplan_id, scope: :community, if: -> { provider_floorplan_id.present? }
  after_commit :populate_image_urls, on: [:create, :update]
  validates :market_rent, :numericality => { greater_than_or_equal_to: -1 }, if: -> { market_rent.present? }
  # before_create :set_image_name
  after_update :crop_image
  after_update :crop_secondary_image

  def as_json options = {}
    super(
      :only => [:id, :name, :image, :file], :include => {
        :amenities => {:only => [:id  , :image] } }
    )
  end

  def populate_image_urls
    if image.present?
      set_standard_url('Floorplan', id)
    end
  end

  def crop_secondary_image
    secondary_image.recreate_versions! if (crop_x_secondary.present? && !image_bit && do_crop_secondary)
  end

  def crop_image
    image.recreate_versions! if (crop_x.present? && image_bit && do_crop)
  end

end
