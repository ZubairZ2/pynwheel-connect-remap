class Gallery < ApplicationRecord
	has_many :gallery_images, dependent: :destroy
	belongs_to :community
	validates :name, presence: true, uniqueness: {scope: :community}
end
