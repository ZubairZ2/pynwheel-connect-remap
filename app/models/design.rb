class Design < ApplicationRecord
	has_one :menu , dependent: :destroy
	has_one :home_screen,dependent: :destroy
	has_one :main_screen,dependent: :destroy
	has_many :home_page_images, dependent: :destroy
	has_one :home_page_video, dependent: :destroy
	belongs_to :community
	accepts_nested_attributes_for :menu
	accepts_nested_attributes_for :main_screen
	accepts_nested_attributes_for :home_screen

	def has_images_loop_type?
		loop_type == "images"
	end

	def has_video_loop_type?
		loop_type == "video"
	end


end
