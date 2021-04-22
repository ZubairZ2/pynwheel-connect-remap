class EdgeState < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy

  def map_locks_with_stops
    MapRemoteLocksJob.perform_async(community, "EdgeState")
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
