# == Schema Information
#
# Table name: expressionists
#
#  id                                        :integer          not null, primary key
#  home_page_menu_position                   :string
#  home_page_position_of_logo                :string
#  home_page_logo_size                       :string
#  home_page_button_border_color             :string
#  display_home_page_button_icon             :boolean          default(TRUE)
#  home_page_button_font_family              :string
#  home_page_button_font_size                :string
#  display_home_page_nav_background          :boolean          default(TRUE)
#  home_page_button_image                    :string
#  global_navigation_button_font_family      :string
#  global_navigation_button_font_size        :string
#  display_global_navigation_button_bg_color :boolean          default(TRUE)
#  filter_panel_button_border_color          :string
#  filter_panel_text_font_size               :string
#  filter_panel_button_text_font_size        :string
#  design_id                                 :integer
#  created_at                                :datetime         not null
#  updated_at                                :datetime         not null
#  display_global_navigation_button_icon     :boolean          default(TRUE)
#  display_home_page_image                   :boolean          default(FALSE)
#  global_navigation_button_border_color     :string
#  spacing_between_buttons                   :string
#  button_on_bg_color                        :string
#  display_button_on_bg_color                :boolean          default(FALSE)
#  global_navigation_button_on_font_color    :string
#  application_background_image              :string
#  display_application_background_image      :boolean          default(FALSE)
#  application_background_color              :string
#  display_apartment_nav_bg_image            :boolean          default(FALSE)
#  apartment_nav_bg_image                    :string
#  display_gallery_nav_bg_image              :boolean          default(FALSE)
#  gallery_nav_bg_image                      :string
#  display_favourities_nav_bg_image          :boolean          default(FALSE)
#  favourities_nav_bg_image                  :string
#  display_additional_pages_nav_bg_image     :boolean          default(FALSE)
#  additional_pages_nav_bg_image             :string
#  button_on_bg_color_opacity                :string
#  application_background_color_opacity      :string
#  apartment_nav_bg_color                    :string
#  gallery_nav_bg_color                      :string
#  favourities_nav_bg_color                  :string
#  additional_pages_nav_bg_color             :string
#  display_apartment_btn_on_image            :boolean          default(FALSE)
#  apartment_btn_on_image                    :string
#  display_gallery_btn_on_image              :boolean          default(FALSE)
#  gallery_btn_on_image                      :string
#  display_neighborhood_btn_on_image         :boolean          default(FALSE)
#  neighborhood_btn_on_image                 :string
#  display_imagepage_btn_on_image            :boolean          default(FALSE)
#  imagepage_btn_on_image                    :string
#  display_webpage_btn_on_image              :boolean          default(FALSE)
#  webpage_btn_on_image                      :string
#  display_favourite_btn_on_image            :boolean          default(FALSE)
#  favourite_btn_on_image                    :string
#  display_apartment_btn_off_image           :boolean          default(FALSE)
#  apartment_btn_off_image                   :string
#  display_gallery_btn_off_image             :boolean          default(FALSE)
#  gallery_btn_off_image                     :string
#  display_neighborhood_btn_off_image        :boolean          default(FALSE)
#  neighborhood_btn_off_image                :string
#  display_imagepage_btn_off_image           :boolean          default(FALSE)
#  imagepage_btn_off_image                   :string
#  display_webpage_btn_off_image             :boolean          default(FALSE)
#  webpage_btn_off_image                     :string
#  display_favourite_btn_off_image           :boolean          default(FALSE)
#  favourite_btn_off_image                   :string
#  global_navigation_btn_on_for_all          :boolean          default(FALSE)
#  global_navigation_btn_off_for_all         :boolean          default(FALSE)
#

class Expressionist < ApplicationRecord
  mount_base64_uploader :home_page_button_image, AvatarUploader
  mount_base64_uploader :application_background_image, AvatarUploader
  mount_base64_uploader :apartment_nav_bg_image, AvatarUploader
  mount_base64_uploader :gallery_nav_bg_image, AvatarUploader
  mount_base64_uploader :favourities_nav_bg_image, AvatarUploader
  mount_base64_uploader :additional_pages_nav_bg_image, AvatarUploader

  mount_base64_uploader :apartment_btn_on_image, AvatarUploader
  mount_base64_uploader :gallery_btn_on_image, AvatarUploader
  mount_base64_uploader :neighborhood_btn_on_image, AvatarUploader
  mount_base64_uploader :imagepage_btn_on_image, AvatarUploader
  mount_base64_uploader :webpage_btn_on_image, AvatarUploader
  mount_base64_uploader :favourite_btn_on_image, AvatarUploader

  mount_base64_uploader :apartment_btn_off_image, AvatarUploader
  mount_base64_uploader :gallery_btn_off_image, AvatarUploader
  mount_base64_uploader :neighborhood_btn_off_image, AvatarUploader
  mount_base64_uploader :imagepage_btn_off_image, AvatarUploader
  mount_base64_uploader :webpage_btn_off_image, AvatarUploader
  mount_base64_uploader :favourite_btn_off_image, AvatarUploader

  belongs_to :design
end
