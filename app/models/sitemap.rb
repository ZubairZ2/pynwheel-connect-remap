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
  mount_uploader :image, SiteMapUploader
  mount_uploader :label_image, SiteMapUploader
  mount_uploader :file, DesignUploader

  belongs_to :community
  has_many :amenities, as: :amenityable
  has_many :elevators, dependent: :destroy
  has_many :hallways, as: :parent
  has_many :access_points, class_name: 'Door', as: :attached_with, dependent: :destroy
  has_one :status, as: :statusable

  validates :image, :presence => {message: "cannot be blank. Please upload site map image first."}, if: -> { image.present? }

  after_save :download_image_to_public, if: ->(obj) { obj.image_changed? }


  def as_json options = {}
    super(
      :only => [:id ,:image, :file, :label_image]
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

  def download_image_to_public
    return unless image.present? && image.url.present?
    # image_url = image.url 
    image_url = "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/floorplate/image/2041/1718911220-Meadows_SM_fl2.png"
   
    # Define the file path with the required naming convention
    extension = File.extname(image_url) # Get the file extension (e.g., .jpg, .png)
    local_file_path = Rails.root.join("public", "maps", "property_#{community.id}#{extension}")

    # Delete the old file if it exists
    File.delete(local_file_path) if File.exist?(local_file_path)

    # Ensure the directory exists
    FileUtils.mkdir_p(File.dirname(local_file_path))

    # Download and save the new file
    File.open(local_file_path, 'wb') do |file|
      file.write(URI.open(image_url).read)
    end

  rescue StandardError => e
    puts "\n\n\n Failed to download image: #{e.message} \n\n\n\n"
  end

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
