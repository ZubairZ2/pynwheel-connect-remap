class Expressionist < ApplicationRecord
  mount_base64_uploader :home_page_button_image, AvatarUploader
  belongs_to :design
end
