class PathPoint < ApplicationRecord
  belongs_to :path
  has_many :neighbour_units, dependent: :destroy
  default_scope {where.not(:x_plot => nil).where.not(:y_plot => nil)}
end
