class BuildingStartingPoint < ApplicationRecord
  belongs_to :community
  
  has_many :paths, as: :map_path
  has_many :path_points, through: :paths
end
