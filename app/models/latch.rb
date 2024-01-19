class Latch < ApplicationRecord
  belongs_to :community
  has_many :latch_locks, dependent: :destroy
  has_one :status, as: :statusable
  mount_base64_uploader :lock_image, AvatarUploader

  def as_json options = {}
    super(
      :only => [:id, :latch_property_name ], :method => [:lock_type]
    )
  end

  def lock_type
    return LATCH
  end

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Latch"
  end
end