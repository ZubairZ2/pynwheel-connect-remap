class Dwelo < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock'
  include LaunchStatusable

  mount_base64_uploader :lock_image, AvatarUploader
  mount_base64_uploader :amenity_lock_image, AvatarUploader

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Dwelo"
  end

  def as_json options = {}
    super(:only => [:id, :community_id, :client_id, :client_secret, :default_community_id]
    )
  end

  # Launch: Dwelo is complete once the community and API client are identified.
  def derive_launch_status
    launch_status_from(community_id.present? && client_id.present? && client_secret.present?)
  end
end
