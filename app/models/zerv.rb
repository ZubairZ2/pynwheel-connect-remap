class Zerv < ApplicationRecord
  belongs_to :community
  has_many :zerv_locks, dependent: :destroy

  def map_locks_with_stops
    MapZervLocksJob.perform_async community
  end
end
