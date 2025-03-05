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
  mount_uploader :svg_image, SiteMapUploader
  mount_uploader :label_image, SiteMapUploader
  mount_uploader :file, DesignUploader

  belongs_to :community
  has_many :amenities, as: :amenityable
  has_many :elevators, dependent: :destroy
  has_many :hallways, as: :parent
  has_many :access_points, class_name: 'Door', as: :attached_with, dependent: :destroy
  has_one :status, as: :statusable

  validates :image, :presence => {message: "cannot be blank. Please upload site map image first."}, if: -> { image.present? }

  def as_json options = {}
    super(
      :only => [:id ,:image, :svg_image, :file, :label_image]
    )
  end

  def get_sitemap_units_data units
    sitemap_units = []

    units.each do |stop|
      sitemap_units << unit_info(stop)
    end

    sitemap_units.present? ? sitemap_units_info(sitemap_units) : nil
  end

  def get_sitemap_amenities_data amenities
    sitemap_amenities = []

    amenities.each do |stop|
      sitemap_amenities << amenity_info(stop)
    end

    sitemap_amenities.present? ? sitemap_amenities_info(sitemap_amenities) : nil
  end

  def sitemap_image_width
    self.width > 0 ? self.width : self.image.width
  end

  def sitemap_image_height
    self.height > 0 ? self.height : self.image.height
  end

  private

  def unit_info unit
    {
      id: unit.id,
      unit_name: unit.name,
      x_plot: unit.x_plot,
      y_plot: unit.y_plot,
    }
  end

  def amenity_info amenity
    {
      id: amenity.id,
      unit_name: amenity.name,
      x_plot: amenity.x_plot,
      y_plot: amenity.y_plot,
    }
  end

  def sitemap_amenities_info sitemap_stops
    {
      id: self.id,
      name: "Sitemap",
      floor_number: "",
      image: self.image,
      height: sitemap_image_height,
      width: sitemap_image_width,
      floor_range: "",
      floorplan_name: "",
      building: "",
      unique_floorplat_amenity_identifier: "#{self.id}",
      floorplate_amenities: sitemap_stops
    }
  end

  def sitemap_units_info sitemap_stops
    {
      id: self.id,
      name: "Sitemap",
      floor_number: "",
      image: self.image,
      height: sitemap_image_height,
      width: sitemap_image_width,
      floor_range: "",
      floorplan_name: "",
      building: "",
      unique_floorplat_unit_identifier: "#{self.id}",
      floorplate_units: sitemap_stops
    }
  end



end
