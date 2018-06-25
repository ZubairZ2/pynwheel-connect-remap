class Design < ApplicationRecord
	mount_base64_uploader :secondary_page_background_image, AvatarUploader
	mount_base64_uploader :global_nav_button_on, AvatarUploader
	mount_base64_uploader :global_nav_button_off, AvatarUploader
	mount_base64_uploader :filter_button, AvatarUploader
	mount_base64_uploader :gallery_button, AvatarUploader
	mount_base64_uploader :filter_panel_background_image, AvatarUploader
	has_one :menu , dependent: :destroy
	has_one :home_screen,dependent: :destroy
	has_one :main_screen,dependent: :destroy
	has_many :home_page_images, -> { order(:sort) }, dependent: :destroy
	has_many :homepage_icons, -> { order(:sort) }, dependent: :destroy
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

	def secondary_images
		count = homepage_icons.count
		if homepage_icons.blank?
			return DefaultImage.limit(5)
		elsif count >= 5
			return homepage_icons
		elsif count < 5
			arr = []
			homepage_icons.each do |i|
				arr << i
			end
			DefaultImage.limit(5-count).each do |d|
				arr << d
			end
			return arr
		end
		return nil			
	end


end
