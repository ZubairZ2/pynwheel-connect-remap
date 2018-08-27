class Location < ApplicationRecord
  include StandardUrl
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
