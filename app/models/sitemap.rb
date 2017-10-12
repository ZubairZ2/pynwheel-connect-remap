class Sitemap < ApplicationRecord
  mount_uploader :image, SiteMapUploader
  belongs_to :community
end
