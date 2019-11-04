# == Schema Information
#
# Table name: gables
#
#  id                                       :integer          not null, primary key
#  hide_tagline                             :boolean          default(TRUE)
#  appartment_button_color                  :string
#  gallery_button_color                     :string
#  neighborhood_button_color                :string
#  favorite_button_color                    :string
#  filter_panel_color                       :string
#  design_id                                :integer
#  created_at                               :datetime         not null
#  updated_at                               :datetime         not null
#  webpages_button_color                    :string
#  imagepages_button_color                  :string
#  home_page_nav_bg_image                   :string
#  display_home_page_nav_bg_image_button    :boolean          default(FALSE)
#  global_nav_bg_image                      :string
#  display_global_nav_bg_image_button       :boolean          default(FALSE)
#  filter_panel_bg_image                    :string
#  display_filter_panel_bg_image_button     :boolean          default(FALSE)
#  filter_panel_text_color                  :string
#  filter_panel_opacity                     :string
#  application_bg_image_gables              :string
#  apartment_bg_image_gables                :string
#  gallery_bg_image_gables                  :string
#  favourite_bg_image_gables                :string
#  additional_pages_bg_image_gables         :string
#  display_application_bg_image_gables      :boolean
#  display_apartment_bg_image_gables        :boolean
#  display_gallery_bg_image_gables          :boolean
#  display_favourite_bg_image_gables        :boolean
#  display_additional_pages_bg_image_gables :boolean
#

class Gable < ApplicationRecord
  belongs_to :design
  mount_base64_uploader :home_page_nav_bg_image, AvatarUploader
  mount_base64_uploader :global_nav_bg_image, AvatarUploader
  mount_base64_uploader :filter_panel_bg_image, AvatarUploader

  mount_base64_uploader :application_bg_image_gables, AvatarUploader
  mount_base64_uploader :apartment_bg_image_gables, AvatarUploader
  mount_base64_uploader :gallery_bg_image_gables, AvatarUploader
  mount_base64_uploader :favourite_bg_image_gables, AvatarUploader
  mount_base64_uploader :additional_pages_bg_image_gables, AvatarUploader

  amoeba do
    enable
    customize(lambda { |original_object,new_object|
      new_object.home_page_nav_bg_image = original_object.home_page_nav_bg_image
      new_object.global_nav_bg_image = original_object.global_nav_bg_image
      new_object.filter_panel_bg_image = original_object.filter_panel_bg_image

      new_object.application_bg_image_gables = original_object.application_bg_image_gables
      new_object.apartment_bg_image_gables = original_object.apartment_bg_image_gables
      new_object.gallery_bg_image_gables = original_object.gallery_bg_image_gables
      new_object.favourite_bg_image_gables = original_object.favourite_bg_image_gables
      new_object.additional_pages_bg_image_gables = original_object.additional_pages_bg_image_gables
    })
  end

end
