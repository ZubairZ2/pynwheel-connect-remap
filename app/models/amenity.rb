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
#  sort                :integer
#  access_code         :string
#  directional_text    :string
#

class Amenity < ApplicationRecord
  has_paper_trail on: [:create,:destroy]
  include RailsSortable::Model
  set_sortable :sort
  include StandardUrl
  mount_base64_uploader :image, AvatarUploader
  belongs_to :amenityable, polymorphic: true
  belongs_to :community
  has_many :amenity_galleries, dependent: :destroy
  
  has_many :paths, as: :map_path
  has_many :path_points, through: :paths
  has_many :remote_locks,  -> { for_amenties }, class_name: 'RemoteLock', foreign_key: 'stop_id', dependent: :destroy

  scope :plotted_amenities, -> { where("x_plot > ? or y_plot > ?", 0, 0) }
  validates :image, :presence => {message: "cannot be blank. Please upload Amenity image first."}
  after_commit :populate_image_urls, on: [:create,:update]
  validate :url_validity
  # validate :image_size


  def url_validity
    require 'uri'
    if video_link.present?
      result = URI.open(video_link).status rescue ""
      unless result.present?
        errors[:base] << "Invalid URL."
      end
    end

  end
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

  def self.path_data
    [{x: 120, y: 455}, {x: 165, y: 655}, {x: 400, y: 155}]
  end
end
