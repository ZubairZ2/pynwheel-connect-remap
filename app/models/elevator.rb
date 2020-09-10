class Elevator < ApplicationRecord
  belongs_to :floorplate
  belongs_to :community
  has_many :duplicates, class_name: 'Elevator', foreign_key: 'duplicate_of'  
  belongs_to :parent, class_name: 'Elevator'

  mount_base64_uploader :image, AvatarUploader
  has_many :elevator_galleries, dependent: :destroy

  has_many :paths, as: :map_path, dependent: :destroy
  has_many :path_points, through: :paths
  
  scope :plotted_elevators, -> { where("x_plot > ? or y_plot > ?", 0, 0) }
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
