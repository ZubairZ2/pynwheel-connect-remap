class Zerv < ApplicationRecord
  belongs_to :community
  has_many :zerv_locks, dependent: :destroy

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Zerv"
  end
end
