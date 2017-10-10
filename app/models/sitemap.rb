class Sitemap < ApplicationRecord
	mount_uploader :image, AvatarUploader
  belongs_to :community
end
