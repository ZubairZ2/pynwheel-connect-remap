class Zerv < ApplicationRecord
  belongs_to :community
  has_many :zerv_locks, dependent: :destroy
  has_one :status, as: :statusable

  def as_json
    super(
      :only => [:id, :username, :password]
    )
  end

  def map_locks_with_stops
    MapLocksJob.perform_async community, "Zerv"
  end
end
