class Elevator < ApplicationRecord
  belongs_to :floorplate
  belongs_to :community
  has_many :duplicates, class_name: 'Elevator', foreign_key: 'duplicate_of'  
  belongs_to :parent, class_name: 'Elevator'

  mount_base64_uploader :image, AvatarUploader
  has_many :elevator_galleries, dependent: :destroy

  has_many :paths, as: :map_path, dependent: :destroy
  has_many :path_points, through: :paths
  
  # has_many :remote_locks,  -> { for_elevators }, class_name: 'RemoteLock', foreign_key: 'stop_id', dependent: :destroy  # was being handled manually
  has_many :remote_locks, as: :stop     # remove it only after confirm refactoring, as it is being used
  has_many :edgestate_locks, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock', as: :stop
  has_many :latch_locks, as: :stop
  has_many :zerv_locks, as: :stop
  has_many :latch_guests, as: :guest_of_stop, dependent: :destroy
  has_many :zerv_guests, as: :guest_of_stop, dependent: :destroy
  has_many :igloohome_locks, as: :stop, dependent: :destroy
  has_many :igloohome_guests, as: :guest_of_stop, dependent: :destroy
  has_many :elevator_banks
  
  has_one :tour_stop, as: :stop, dependent: :destroy
  validate :check_floorplate_covering_range

  scope :plotted_elevators, -> { where("x_plot > ? or y_plot > ?", 0, 0) }
  def check_floorplate_covering_range
    unless floorplate_covering_range.present?
      errors[:base] << "Floorplate covering range can not be blank."
    end
  end
  def floors
    floors = []
    h = floorplate_covering_range
    if h.count('-') == 2 # when input is like "-1-5"
      h = h[0] + h[1..h.size - 1].sub('-','.')
      arr = h.split('.')
      for n in arr[0].to_i..arr[1].to_i
        floors << n
      end
      floors
    else
      if floorplate_covering_range[0] == "-"
      floors << floorplate_covering_range.to_i
    elsif floorplate_covering_range.include? '-'
      arr = floorplate_covering_range.split('-')
      for n in arr[0].to_i..arr[1].to_i
        floors << n
      end
    elsif floorplate_covering_range.include? ','
      flrs = floorplate_covering_range.split(',')
      flrs.each do |f|
        floors << f.to_i
      end
    else
      floors << floorplate_covering_range.to_i
    end
    floors
    end
    
  end

  def self.fetch_elevator_according_to_floor(floors_ids, elevators_ids)
    elevator_floors = {}
    elevators_to_floors = {}
    elevators = where(id: elevators_ids) # Here no building check is applied
    elevators.each {|elevator| elevators_to_floors[elevator.id] = elevator.floors }
    elevators_to_floors.each do |elevator, ele_floors|
      ele_floors.each do |floor|
        if elevator_floors.has_key?(floor)
          elevator_floors[floor] << elevator
        else
          elevator_floors[floor] = [elevator]
        end
      end
    end
    uncoverd_floors = floors_ids - elevator_floors.keys
    uncoverd_floors.each {|floor| elevator_floors[floor] = [] }
    elevator_floors
  end

  def self.fetch_elevator_according_to_building(floors_ids, elevators_ids, building_list)
    elevator_floors = {}
    building_list.each {|building| elevator_floors[building] = {} }
    building_list.each do |building|
      elevators_to_floors = {}
      elevators = where(id: elevators_ids).where(building: building)
      elevators.each {|elevator| elevators_to_floors[elevator.id] = elevator.floors }
      elevators_to_floors.each do |elevator, ele_floors|
        ele_floors.each do |floor|
          if elevator_floors[building].has_key?(floor)
            elevator_floors[building][floor] << elevator
          else
            elevator_floors[building][floor] = [elevator]
          end
        end
      end
      uncoverd_floors = floors_ids - elevator_floors[building].keys
      uncoverd_floors.each {|floor| elevator_floors[building][floor] = [] }
    end
    elevator_floors
  end

  def max_floor
    # empty string means there is no floor 
    max_floor = ""
    if floors.present?
      max_floor = floors.last
    end
    max_floor
  end

  def min_floor
    # empty string means there is no floor 
    min_floor = ""
    if floors.present?
      min_floor = floors.first
    end
    min_floor
  end

end
