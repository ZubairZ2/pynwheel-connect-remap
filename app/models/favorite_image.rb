class FavoriteImage < ApplicationRecord
	mount_uploader :image, AvatarUploader
  belongs_to :favorite_setting
end
