class EdgeState < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy

  def map_locks_with_stops
    MapRemoteLocksJob.perform_async(community, "EdgeState")
  end

  def self.current_client_credential_edgestate(edgestate)
    !edgestate.present? || (edgestate and edgestate.client_id and edgestate.client_secret).present? ||
    (edgestate and !edgestate.client_id and !edgestate.client_secret and !edgestate.refresh_token).present?
  end
  
end
