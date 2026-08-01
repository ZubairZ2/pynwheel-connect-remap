# == Schema Information
#
# Table name: locations
#
#  id                 :integer          not null, primary key
#  address            :string
#  latitude           :decimal(, )
#  longitude          :decimal(, )
#  category           :string
#  title              :string
#  neighborhood_id    :integer
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  image              :string
#  standard_image_url :string
#  distance           :float
#  time               :string
#  rating             :float
#

class Location < ApplicationRecord
  has_paper_trail
  include StandardUrl
  include ::S3Acceleration
  mount_uploader :image, AvatarUploader
  belongs_to :neighborhood
  validates_presence_of :latitude, :longitude, :title
  validates :latitude , numericality: { greater_than_or_equal_to:  -90, less_than_or_equal_to:  90 }
	validates :longitude, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
  after_commit :populate_image_urls, on: [:create,:update]


  def populate_image_urls
    if image.present?
      set_standard_url('Location',id)
    end
  end
end
