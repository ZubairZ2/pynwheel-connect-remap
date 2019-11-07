# == Schema Information
#
# Table name: designs
#
#  id                                              :integer          not null, primary key
#  primary_color                                   :string
#  secondary_color                                 :string
#  primary_font_family                             :string
#  primary_font_size                               :string
#  primary_font_weight                             :string
#  primary_text_align                              :string
#  primary_font_color                              :string
#  secondary_font_family                           :string
#  secondary_font_size                             :string
#  secondary_font_weight                           :string
#  secondary_text_align                            :string
#  secondary_font_color                            :string
#  main_screen_background_color                    :string
#  inner_screen_background_color                   :string
#  community_id                                    :integer
#  created_at                                      :datetime         not null
#  updated_at                                      :datetime         not null
#  loop_type                                       :string           default("images")
#  logo_position                                   :string
#  secondary_logo_position                         :string
#  secondary_page_background_image                 :string
#  global_navigation_position                      :string
#  animation                                       :string           default("bouncing effects")
#  global_navigation_font_color                    :string
#  global_navigation_background_color              :string
#  global_navigation_button_color                  :string
#  global_navigation_buttons_opacity               :string
#  global_nav_bg_opacity                           :string
#  button_shape                                    :string
#  global_nav_buttons_height                       :string
#  global_nav_buttons_width                        :string
#  secondary_page_menu_border                      :string
#  global_nav_button_on                            :string
#  global_nav_button_off                           :string
#  buttons_as_image                                :boolean          default(FALSE)
#  filter_panel_color                              :string
#  filter_panel_font_style                         :string
#  filter_panel_font_color                         :string
#  filter_button_color                             :string
#  filter_button_font_style                        :string
#  filter_button_font_color                        :string
#  filter_panel_opacity                            :string
#  filter_buttons_opacity                          :string
#  gallery_buttons_opacity                         :string
#  filter_menu_buttons_border                      :string
#  gallery_buttons_border                          :string
#  filter_button                                   :string
#  gallery_button                                  :string
#  filter_panel_background_image                   :string
#  home_page_button_shape                          :string
#  home_page_navigation_background_height          :string
#  home_page_buttons_height                        :string
#  home_page_buttons_width                         :string
#  home_page_buttons_opacity                       :string
#  home_page_navigation_background_opacity         :string
#  home_page_buttons_border                        :string
#  marker_background_color                         :string
#  marker_style                                    :string
#  header_bg_color                                 :string
#  header_font_color                               :string
#  details_bg_color                                :string
#  details_font_color                              :string
#  available_appartments_font_color                :string
#  available_appartments_bg_color                  :string
#  floor_bg_color                                  :string
#  unit_header_bg_color                            :string
#  unit_header_font_color                          :string
#  unit_details_font_color                         :string
#  unit_details_bg_color                           :string
#  floorplan_name_bg_color                         :string
#  floorplan_name_font_color                       :string
#  unit_bg_color                                   :string
#  home_page_navigation_background_color           :string
#  home_page_navigation_button_color               :string
#  home_page_navigation_font_color                 :string
#  filter_button_as_image                          :boolean          default(FALSE)
#  gallery_button_as_image                         :boolean          default(FALSE)
#  filter_panel_background_as_image                :boolean          default(FALSE)
#  gallery_button_on_image                         :string
#  gallery_button_on_as_image                      :boolean          default(FALSE)
#  global_nav_button_on_as_image                   :boolean          default(FALSE)
#  global_nav_button_off_as_image                  :boolean          default(FALSE)
#  unit_header_bg_color_opacity                    :string
#  unit_details_bg_color_opacity                   :string
#  floorplan_name_bg_color_opacity                 :string
#  unit_bg_color_opacity                           :string
#  header_bg_color_opacity                         :string
#  details_bg_color_opacity                        :string
#  available_appartments_bg_color_opacity          :string
#  floor_bg_color_opacity                          :string
#  property_map_size                               :string           default("30px")
#  property_map_color                              :string           default("#d37474")
#  amenity_map_marker_size                         :string           default("30px")
#  amenity_map_marker_color                        :string           default("#ff0000")
#  modernist_map_marker_color                      :string           default("no color")
#  modernist_amenity_map_marker_color              :string           default("no color")
#  modernists_amenity_map_marker_color             :string           default("no color")
#  property_map_size_integer                       :integer          default(30)
#  amenity_map_marker_size_integer                 :integer          default(30)
#  futurist_ebrochure_header_background_color      :string           default("#808080")
#  modernist_ebrochure_header_background_color     :string           default("No color")
#  gables_ebrochure_header_background_color        :string           default("#808080")
#  panther_ebrochure_header_background_color       :string           default("#808080")
#  expressionist_ebrochure_header_background_color :string           default("No color")
#  display_ebrochure_header_background_color       :boolean          default(FALSE)
#  ebrochure_email_message                         :string           default("Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.\n\nWe look forward to seeing you again soon. ")
#  ebrochure_email_message_updated                 :boolean          default(FALSE)
#  futurist_property_map_marker_color              :string
#  expressionist_property_map_marker_color         :string
#  panther_property_map_marker_color               :string
#  futurist_amenity_map_marker_color               :string
#  expressionist__amenity_map_marker_color         :string
#  panther_amenity_map_marker_color                :string
#  futurist_property_map_size                      :integer
#  expressionist_property_map_size                 :integer
#  panther_property_map_size                       :integer
#  modernist_property_map_size                     :integer
#  futurist_amenity_map_size                       :integer
#  expressionist_amenity_map_size                  :integer
#  panther_amenity_map_size                        :integer
#  modernist_amenity_map_size                      :integer
#  futurist_unit_floorplan_map_marker_color        :string
#  expressionist_unit_floorplan_map_marker_color   :string
#  panther_unit_floorplan_map_marker_color         :string
#  gables_unit_floorplan_map_marker_color          :string
#  modernist_unit_floorplan_map_marker_color       :string
#  display_filter_label_image                      :boolean
#  filter_label_image                              :string
#  filter_panel_label_color                        :string
#  filter_panel_label_opacity                      :string
#

class Design < ApplicationRecord
	has_paper_trail
	mount_base64_uploader :secondary_page_background_image, AvatarUploader
	mount_base64_uploader :global_nav_button_on, AvatarUploader
	mount_base64_uploader :global_nav_button_off, AvatarUploader
	mount_base64_uploader :filter_button, AvatarUploader
	mount_base64_uploader :gallery_button, AvatarUploader
	mount_base64_uploader :filter_panel_background_image, AvatarUploader
	mount_base64_uploader :filter_label_image, AvatarUploader
	mount_base64_uploader :gallery_button_on_image, AvatarUploader
	has_one :menu , dependent: :destroy
	has_one :gable , dependent: :destroy
	has_one :filter_panel , dependent: :destroy
	has_one :expressionist , dependent: :destroy
	has_one :home_screen,dependent: :destroy
	has_one :main_screen,dependent: :destroy
	has_many :home_page_images, -> { order(:sort) }, dependent: :destroy
	has_many :homepage_icons, -> { order(:sort) }, dependent: :destroy
	has_one :home_page_video, dependent: :destroy
	belongs_to :community
	accepts_nested_attributes_for :menu
	accepts_nested_attributes_for :main_screen
	accepts_nested_attributes_for :home_screen
	accepts_nested_attributes_for :gable
	accepts_nested_attributes_for :expressionist
	accepts_nested_attributes_for :filter_panel

	amoeba do
		enable
		customize(lambda { |original_object,new_object|
			new_object.secondary_page_background_image = original_object.secondary_page_background_image
			new_object.global_nav_button_on = original_object.global_nav_button_on
			new_object.global_nav_button_off = original_object.global_nav_button_off
			new_object.filter_button = original_object.filter_button
			new_object.gallery_button = original_object.gallery_button
			new_object.filter_panel_background_image = original_object.filter_panel_background_image
			new_object.filter_label_image = original_object.filter_label_image
			new_object.gallery_button_on_image = original_object.gallery_button_on_image
		})
	end
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
