# == Schema Information
#
# Table name: galleries
#
#  id           :integer          not null, primary key
#  name         :string
#  community_id :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class Gallery < ApplicationRecord
	has_many :gallery_images, dependent: :destroy
	belongs_to :community
	validates :name, presence: true, uniqueness: {scope: :community}
end
