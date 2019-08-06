class Path < ApplicationRecord
	belongs_to :map_path, polymorphic: true
	has_many :path_points
end
