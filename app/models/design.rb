class Design < ApplicationRecord
	has_one :menu , dependent: :destroy
	has_one :home_screen,dependent: :destroy
	has_one :main_screen,dependent: :destroy
	has_many :home_page_images, dependent: :destroy
	has_many :home_page_videos, dependent: :destroy
	belongs_to :community
	accepts_nested_attributes_for :menu
	accepts_nested_attributes_for :main_screen
	accepts_nested_attributes_for :home_screen
end
