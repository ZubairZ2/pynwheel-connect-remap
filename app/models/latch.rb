class Latch < ApplicationRecord
  belongs_to :community
  has_many :latch_locks, dependent: :destroy
  has_one :status, as: :statusable
  mount_base64_uploader :lock_image, AvatarUploader
  mount_base64_uploader :amenity_lock_image, AvatarUploader


 def as_json(options = {})
    super(
      options.merge(
        only: [:id, :latch_property_name],
        methods: [:lock_type, :setup_options]
      )
    )
  end

  def lock_type
    return LATCH
  end

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Latch"
  end

  def setup_options
    {
      is_building_name_added: is_building_name_added,
      is_integration_submitted: is_integration_submitted,
      is_mission_control_setup: is_mission_control_setup
    }
  end
end