# == Schema Information
#
# Table name: tours
#
#  id           :integer          not null, primary key
#  community_id :integer
#  name         :string
#  latitude     :decimal(, )
#  longitude    :decimal(, )
#  image        :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  x_plot       :integer          default(0)
#  y_plot       :integer          default(0)
#

class Tour < ApplicationRecord
  belongs_to :community
  has_many :tour_stops, dependent: :destroy
  has_many :chatrooms, dependent: :destroy

  has_one :path, as: :map_path
  has_one :tour_setting
  has_many :path_points, through: :path

end
