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
end
