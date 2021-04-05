class BuildingStartingPoint < ApplicationRecord
  belongs_to :community
  validate :validate_building
  
  has_many :paths, as: :map_path
  has_many :path_points, through: :paths
  
  # has_many :remote_locks,  -> { for_building_starting_points }, class_name: 'RemoteLock', foreign_key: 'stop_id', dependent: :destroy # was being handled manually
  has_many :remote_locks, as: :stop     # remove it only after confirm refactoring, as it is being used
  has_many :edgestate_locks, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :latch_locks, as: :stop
  has_many :zerv_locks, as: :stop
  has_many :latch_guests, as: :guest_of_stop, dependent: :destroy
  has_many :zerv_guests, as: :guest_of_stop, dependent: :destroy
  
  has_one :tour_stop, as: :stop, dependent: :destroy
  def validate_building
  	bsp = BuildingStartingPoint.where(community_id: attributes["community_id"], building: attributes["building"]).where.not(id: self.id)
  	errors[:base] << "Building Starting Point already exist." if bsp.count > 0
  end
end
