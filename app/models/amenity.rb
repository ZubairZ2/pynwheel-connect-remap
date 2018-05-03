class Amenity < ApplicationRecord
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  belongs_to :amenityable, polymorphic: true
  belongs_to :community
  validates :image, :presence => {message: "cannot be blank. Please upload Amenity image first."}
  after_commit :populate_image_urls

  def populate_image_urls
    if image.present?
      set_standard_url('Amenity',id)
    end
  end
end
