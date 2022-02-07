class Dwelo < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock'
  has_one :status, as: :statusable

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Dwelo"
  end

  def as_json
    super(:only => [:id, :client_id, :client_secret]
    )
  end

end
