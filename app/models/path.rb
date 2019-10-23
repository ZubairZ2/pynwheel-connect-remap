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
	has_paper_trail
	belongs_to :map_path, polymorphic: true
	has_many :path_points, dependent: :destroy
end
