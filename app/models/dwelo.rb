class Dwelo < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock'

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Dwelo"
  end
end
