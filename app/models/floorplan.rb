class Floorplan < ApplicationRecord
  include StandardUrl
  include ::S3Acceleration
  include LaunchStatusable

  mount_base64_uploader :image, AvatarUploader
  mount_base64_uploader :secondary_image, AvatarUploader
  mount_base64_uploader :file, DesignUploader
  # process_in_background :file
  # process_in_background :image
  # process_in_background :secondary_image
  belongs_to :community
  has_many :amenities, as: :amenityable
  # `has_one :status` comes from LaunchStatusable
  # validates_uniqueness_of :name, scope: :community, on: [:create, :update]
  validates_uniqueness_of :provider_floorplan_id, scope: :community, if: -> { provider_floorplan_id.present? }
  after_commit :populate_image_urls, on: [:create, :update]
  validates :market_rent, :numericality => { greater_than_or_equal_to: -1 }, if: -> { market_rent.present? }
  # before_create :set_image_name
  after_update :crop_image, if: ->(obj) { obj.image_changed? }
  after_update :crop_secondary_image, if: ->(obj) { obj.secondary_image_changed? }

  after_update :update_floorplan_units_description, if: :description_changed?

  enum availability_status: { 
    available: 0,
    limited_availability: 1,
    almost_gone: 2,
    sold_out: 3
  }

  def as_json options = {}
    super(
      :only => [:id, :name, :virtual_tour_url, :description],
      :methods => [:description_text_limit, :floorplan_image],
      :include => {
        :amenities => {
          :only => [:id, :name, :description],
          :methods => [:amenity_image]
        }
      }
    )
  end

  def floorplan_image
    image&.url.present? ? image : nil
  end

  # Same rule Community#set_floorplan_status applies: a floorplan that already
  # carries artwork is content Launch can review, one without is still being
  # worked on.
  def derive_launch_status
    (image&.url.present? || file&.url.present?) ? SUBMITTED : IN_PROGRESS
  end

  def update_floorplan_units_description
    FloorPlans::UnitsService.new(self&.id).update_floorplan_units_description()
  end

  def description_text_limit
    ENV["DESCRIPTION_LIMIT"].to_i
  end

  def populate_image_urls
    if image.present?
      set_standard_url('Floorplan', id)
    end
  end

  def crop_secondary_image
    secondary_image.recreate_versions! if (crop_x_secondary.present? && !image_bit && do_crop_secondary)
    self.update(do_crop_secondary: false)
  end

  def crop_image
    image.recreate_versions! if (crop_x.present? && image_bit && do_crop)
  end

  def get_floorplan_virtual_tour_url
    if self.virtual_tour_url.present?
      if self.virtual_tour_url.include? '</iframe>'
        iframe_url = self.virtual_tour_url.split('height')
        if iframe_url[1][3] == '"'
          iframe_url[1][2] = '1' + '0' + '0' + '%'
        elsif iframe_url[1][4] == '"'
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0' + '0' + '%'
        elsif iframe_url[1][5] == '"'
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0'
          iframe_url[1][4] = '0' + '%'
        else
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0'
          iframe_url[1][4] = '0'
          iframe_url[1][5] = '%'
        end
        
        iframe_url[0] + 'height' + iframe_url[1]
      else
        self.virtual_tour_url
      end
    else
      ""
    end
  end

  private

end
