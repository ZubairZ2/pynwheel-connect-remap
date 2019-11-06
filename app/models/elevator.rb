class Elevator < ApplicationRecord
  belongs_to :floorplate
  belongs_to :community
  
  mount_base64_uploader :image, AvatarUploader
  has_many :elevator_galleries, dependent: :destroy

  has_many :paths, as: :map_path
  has_many :path_points, through: :paths

  scope :plotted_elevators, -> { where("x_plot > ? or y_plot > ?", 0, 0) }
end
