class PathPoint < ApplicationRecord
  belongs_to :floorplate
  has_many :neighbour_units, dependent: :destroy
  default_scope {where.not(:x => nil).where.not(:y => nil)}
end
