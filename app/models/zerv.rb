class Zerv < ApplicationRecord
  mount_base64_uploader :lock_image, AvatarUploader
  mount_base64_uploader :amenity_lock_image, AvatarUploader

  belongs_to :community
  has_many :zerv_locks, dependent: :destroy
  has_one :status, as: :statusable

  # after_update :crop_image

  def as_json options = {}
    super(
      :only => [:id, :badge_id, :facility_id, :card_format, :username, :password]
    )
  end

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Zerv"
  end

  # def crop_image
  #   image.recreate_versions! if crop_x.present?
  # end

end
