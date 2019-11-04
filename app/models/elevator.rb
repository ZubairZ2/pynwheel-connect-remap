class Elevator < ApplicationRecord
  belongs_to :floorplate
  belongs_to :community
  
  mount_base64_uploader :image, AvatarUploader

  has_many :paths, as: :map_path
  has_many :path_points, through: :paths

  scope :plotted_elevators, -> { where("x_plot > ? or y_plot > ?", 0, 0) }

	#TODO - Maybe removed, used for testing purpose 
  def self.path_data
    [{x: 120, y: 455}, {x: 165, y: 655}, {x: 400, y: 155}]
  end
end
