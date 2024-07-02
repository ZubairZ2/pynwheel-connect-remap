class EdgeState < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy
  has_many :edgestate_locks, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock'
  has_one :status, as: :statusable
  mount_base64_uploader :lock_image, AvatarUploader
  mount_base64_uploader :amenity_lock_image, AvatarUploader


  def map_locks_with_stops
    MapLocksJob.perform_async community, "EdgeState"
  end

  def self.active_client_credential_edgestate(edgestate)
    !edgestate.present? || (edgestate and edgestate.client_id and edgestate.client_secret).present? ||
    (edgestate and !edgestate.client_id and !edgestate.client_secret and !edgestate.refresh_token).present?
  end

  def self.active_code_grant_auth(edgestate)
    (edgestate.present? and edgestate.is_authorized_with_pynwheel == true) || 
    (edgestate and edgestate.refresh_token && !edgestate.client_id and !edgestate.client_secret).present?
  end
  
end
