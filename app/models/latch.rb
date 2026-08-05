class Latch < ApplicationRecord
  belongs_to :community
  has_many :latch_locks, dependent: :destroy
  include LaunchStatusable

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

  # Launch: Latch is complete once the property is named and the integration steps are done.
  def derive_launch_status
    launch_status_from(latch_property_name.present? && is_building_name_added && is_integration_submitted && is_mission_control_setup)
  end
end