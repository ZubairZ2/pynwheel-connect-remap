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
  serialize :map_ocr_data, Array
  mount_uploader :image, SiteMapUploader
  mount_uploader :label_image, SiteMapUploader

  belongs_to :community
  has_many :amenities, as: :amenityable
  has_many :elevators, dependent: :destroy
  has_many :hallways, as: :parent
  has_many :access_points, class_name: 'Door', as: :attached_with, dependent: :destroy
  has_one :status, as: :statusable

  validates :image, :presence => {message: "cannot be blank. Please upload site map image first."}

  def as_json
    super(
      :only => [:id , :image , :label_image]
    )
  end

end
