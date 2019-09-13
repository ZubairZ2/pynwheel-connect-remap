# == Schema Information
#
# Table name: neighbour_units
#
#  id            :integer          not null, primary key
#  path_point_id :integer
#  unit_id       :integer
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class NeighbourUnit < ApplicationRecord
  belongs_to :path_point
end
