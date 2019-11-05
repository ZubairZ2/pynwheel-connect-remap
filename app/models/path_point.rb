# == Schema Information
#
# Table name: path_points
#
#  id         :integer          not null, primary key
#  x_plot     :integer
#  y_plot     :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  path_id    :integer
#  order      :integer
#  reordered  :boolean          default(FALSE)
#

class PathPoint < ApplicationRecord
  belongs_to :path
  has_many :neighbour_units, dependent: :destroy
  default_scope {where.not(:x_plot => nil).where.not(:y_plot => nil)}
  amoeba do
    enable
  end
end
