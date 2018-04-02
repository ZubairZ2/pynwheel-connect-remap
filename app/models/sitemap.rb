class Sitemap < ApplicationRecord
  mount_uploader :image, SiteMapUploader
  belongs_to :community
  validates :image, :presence => {message: "cannot be blank. Please upload site map image first."}
  has_many :amenities, as: :amenityable
end
