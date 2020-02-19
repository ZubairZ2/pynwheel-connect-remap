# == Schema Information
#
# Table name: paths
#
#  id            :integer          not null, primary key
#  name          :string
#  map_path_id   :integer
#  map_path_type :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class Path < ApplicationRecord
	belongs_to :map_path, polymorphic: true
  belongs_to :map_path_to, polymorphic: true
  belongs_to :map_path_from, polymorphic: true
	has_many :path_points, dependent: :destroy
end
