class Expressionist < ApplicationRecord
  mount_base64_uploader :home_page_button_image, AvatarUploader
  mount_base64_uploader :application_background_image, AvatarUploader
  mount_base64_uploader :apartment_nav_bg_image, AvatarUploader
  mount_base64_uploader :gallery_nav_bg_image, AvatarUploader
  mount_base64_uploader :favourities_nav_bg_image, AvatarUploader
  mount_base64_uploader :additional_pages_nav_bg_image, AvatarUploader
  belongs_to :design
end
