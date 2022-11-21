class RemoteLock < ApplicationRecord
  include StandardBehaviourForLock
  belongs_to :edge_state
  belongs_to :dwelo
  belongs_to :stop, polymorphic: true
  has_one :status, as: :statusable

  # belongs_to :unit
  # belongs_to :amenity
  # belongs_to :elevator
  # belongs_to :building_starting_point
  # belongs_to :tour

  # scope :for_units, -> { where stop_type: "unit"}
  # scope :for_amenties, -> { where stop_type: "amenity"}
  # scope :for_elevators, -> { where stop_type: "elevator"}
  # scope :for_building_starting_points, -> { where stop_type: "building_starting_point"}
  # scope :for_starting_points, -> { where stop_type: "tour"}
  
  scope :dwelo_locks, -> {where edge_state_id: nil}
  scope :edgestate_locks, -> {where dwelo_id: nil}

  before_destroy :clear_lock_provider

  def as_json options = {}
    super(
      :only => [:id, :edge_state_id]
    )
  end
end
