class Amenity < ApplicationRecord
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  belongs_to :amenityable, polymorphic: true
  belongs_to :community
  scope :plotted_amenities, -> { where("x_plot > ? or y_plot > ?", 0, 0) }
  validates :image, :presence => {message: "cannot be blank. Please upload Amenity image first."}
  after_commit :populate_image_urls, on: [:create,:update]

  def populate_image_urls
    if image.present?
      set_standard_url('Amenity',id)
    end
  end
end
