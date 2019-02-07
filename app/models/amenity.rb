# == Schema Information
#
# Table name: amenities
#
#  id                  :integer          not null, primary key
#  provider_amenity_id :string
#  amenty_type         :string
#  description         :text
#  unit_id             :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  name                :string
#  image               :string
#  x_plot              :integer
#  y_plot              :integer
#  amenityable_type    :string
#  amenityable_id      :integer
#  community_id        :integer
#  standard_image_url  :string
#

class Amenity < ApplicationRecord
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  belongs_to :amenityable, polymorphic: true
  belongs_to :community
  scope :plotted_amenities, -> { where("x_plot > ? or y_plot > ?", 0, 0) }
  validates :image, :presence => {message: "cannot be blank. Please upload Amenity image first."}
  after_commit :populate_image_urls, on: [:create,:update]
  # validate :image_size
  def image_size
    if image.size > 1.megabytes
      errors[:base] << "File can not be greater than 5MB"
    end
  end
  def populate_image_urls
    if image.present?
      set_standard_url('Amenity',id)
    end
  end
end
