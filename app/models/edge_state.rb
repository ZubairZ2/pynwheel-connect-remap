class EdgeState < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy
  has_many :edgestate_locks, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock'

  def map_locks_with_stops
    MapLocksJob.perform_async community, "EdgeState"
  end
  
end
