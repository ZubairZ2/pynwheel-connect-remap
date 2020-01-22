# == Schema Information
#
# Table name: sitemaps
#
#  id           :integer          not null, primary key
#  image        :string
#  community_id :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class Sitemap < ApplicationRecord
  # has_paper_trail
  mount_uploader :image, SiteMapUploader
  belongs_to :community
  validates :image, :presence => {message: "cannot be blank. Please upload site map image first."}
  has_many :amenities, as: :amenityable

  has_many :elevators, dependent: :destroy

end
