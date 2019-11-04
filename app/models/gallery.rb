# == Schema Information
#
# Table name: galleries
#
#  id           :integer          not null, primary key
#  name         :string
#  community_id :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  sort         :integer
#

class Gallery < ApplicationRecord
	include RailsSortable::Model
	set_sortable :sort

	has_many :gallery_images, dependent: :destroy
	belongs_to :community
	validates :name, presence: true, uniqueness: {scope: :community}
	amoeba do
		enable
	end
	def delete_gallery
		DeleteGalleryJob.perform_async self
	end
end
