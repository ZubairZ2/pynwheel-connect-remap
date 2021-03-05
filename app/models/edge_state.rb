class EdgeState < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy

  def map_locks_with_stops
    MapRemoteLocksJob.perform_async(community, "EdgeState")
  end
  
end
