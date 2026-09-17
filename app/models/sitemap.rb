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
  include ::S3Acceleration
  include SvgOptimizableMap

  include StoredImageDimensions

  mount_uploader :image, SiteMapUploader
  mount_uploader :svg_image, SiteMapUploader
  mount_uploader :label_image, SiteMapUploader
  mount_uploader :file, DesignUploader

  belongs_to :community
  has_many :amenities, as: :amenityable
  has_many :elevators, dependent: :destroy
  has_many :hallways, as: :parent
  has_many :access_points, class_name: 'Door', as: :attached_with, dependent: :destroy
  include LaunchStatusable

  # An SVG uploaded in Connect lands on a record that may already be marked in
  # progress; let Launch see the map is ready for review.
  after_commit :advance_launch_status, on: :update, if: :saved_change_to_svg_image?

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

  # Launch: the property map form is complete once the map artwork is in,
  # whether that is a raster image, a design file or an SVG.
  def derive_launch_status
    launch_status_from(image&.url.present? || file&.url.present? || svg_image&.url.present?)
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
