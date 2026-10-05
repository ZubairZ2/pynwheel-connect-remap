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
  has_many :igloohome_locks, as: :stop, dependent: :destroy
  has_many :igloohome_guests, as: :guest_of_stop, dependent: :destroy
  
  has_one :tour_stop, as: :stop, dependent: :destroy
  scope :fetch_building_starting_exit_points, -> (building_starting_exit_points_ids) { where(id: building_starting_exit_points_ids)}

  # Wayfinding (October 2026): see Elevator.
  has_many :hallway_attachments, as: :attachable, dependent: :delete_all
  before_destroy :destroy_legacy_tour_stops
  after_commit :bump_wayfinding_version, on: %i[create destroy]
  after_commit :bump_wayfinding_version, on: :update, if: :wayfinding_fields_changed?

  def destroy_legacy_tour_stops
    TourStops::Remove.for_record!(self)
  end

  def wayfinding_fields_changed?
    saved_change_to_x_plot? || saved_change_to_y_plot? || saved_change_to_floor? || saved_change_to_building?
  end

  def bump_wayfinding_version
    Wayfinding::VersionBump.community_levels!(community_id)
  end

  def validate_building
  	bsp = BuildingStartingPoint.where(community_id: attributes["community_id"], building: attributes["building"]).where.not(id: self.id)
  	errors[:base] << "Building Starting Point already exist." if bsp.count > 0
  end
end
