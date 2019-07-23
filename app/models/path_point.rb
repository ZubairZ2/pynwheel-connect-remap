class PathPoint < ApplicationRecord
  belongs_to :floorplate
  has_many :neighbour_units, dependent: :destroy
end
