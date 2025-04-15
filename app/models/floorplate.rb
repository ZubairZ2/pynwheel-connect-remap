# == Schema Information
#
# Table name: floorplates
#
#  id                  :integer          not null, primary key
#  name                :string
#  number              :integer
#  building            :string
#  range               :string
#  image               :string
#  community_id        :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  standard_image_url  :string
#  svg_image_url       :string
#  height              :float
#  width               :float
#  floor_name          :string
#  floor_name_added    :boolean          default(FALSE)
#  name_is_updated     :boolean
#  building_is_updated :boolean
#  manual_override     :boolean          default(FALSE)
#

class Floorplate < ApplicationRecord
  include StandardUrl
  include ::S3Acceleration

  mount_uploader :image, SiteMapUploader
  mount_uploader :svg_image, SiteMapUploader
  mount_uploader :label_image, SiteMapUploader
  mount_uploader :file, DesignUploader

  belongs_to :community
  has_many :units, dependent: :destroy
  has_many :amenities, as: :amenityable
  has_many :elevators, dependent: :destroy
  has_many :hallways, as: :parent
  has_many :access_points, class_name: 'Door', as: :attached_with, dependent: :destroy
  has_one :status, as: :statusable

  validates_uniqueness_of :name, scope: :community_id, if: -> { name.present? }
  validates :image, :presence => {message: "cannot be blank. Please upload Floor Plate image first."}, if: -> { image.present? }
  validates_with FloorValidator

  before_destroy :reset_units_plots
  after_commit :populate_image_urls, on: [:create,:update]

  def contains_floor?(floor_number)
    floor_number = floor_number.to_i
      
    if range.include?('-')
      start_floor, end_floor = range.split('-').map(&:to_i)
      floor_number.between?(start_floor, end_floor)
    else
      range.to_i == floor_number
    end
  end

  def get_floorplate_amenities_data floor, community_id
    amenities = self.amenities.where(floor: floor, community_id: community_id).where.not(building: ["", nil, "N/A"])
    floorplate_amenities = []

    amenities.each do |stop|
      floorplate_amenities << amenity_info(stop)
    end

    floorplate_amenities.present? ? floorplate_amenities_info(floor, floorplate_amenities) : nil

  end

  def get_floorplate_units_data floor, provider_floorplan_id, community
    units = self.units.available_units(community.enable_svg_mode?, true).where(floor: floor, floorplan_id: provider_floorplan_id, community_id: community.id).where.not(building: ["", nil, "N/A"])
    floorplate_units = []

    units.each do |stop|
      floorplate_units << unit_info(stop)
    end

    floorplate_units.present? ? floorplate_units_info(floor, floorplate_units) : nil

  end

  def as_json options = {}
    super(
      :only => [:id, :name, :range, :image, :svg_image, :label_image, :file]
    )
  end

  def reset_units_plots
    self.units.update_all(x_plot: 0,y_plot: 0, floorplate_id: nil)
  end

  def floors
    floors = []
    if range[0] == "-"
      floors << range.to_i
    elsif range.include? '-'
      arr = range.split('-')
      for n in arr[0].to_i..arr[1].to_i
        floors << n
      end
    elsif range.include? ','
      flrs = range.split(',')
      flrs.each do |f|
        floors << f.to_i
      end
    else
      floors << range.to_i
    end
    floors
  end

  def fetch_units
    units = Unit.visible_units.where(community_id: community_id,floor: self.floors)
  end

  def fetch_elevators(floor, building = [nil,""]) # nil or empty string for 0 or no building
    if (building == [nil, ""])
      elevators = Elevator.where(community_id: community_id) # For temporary purpose we are fetching every building name elevators
    else
      elevators = Elevator.where(community_id: community_id, building: building)
    end
    elevators = elevators.map {|elevator| elevator if elevator.floors.include?(floor) }.compact
    elevators
  end

  def community_floors
    floorplates = community.floorplates.select{|f| f.id != self.id}
    floorplates.map{|f| f.floors}.flatten.sort
  end

  def populate_image_urls
    if image.present?
      set_standard_url('Floorplate',id)
    end
  end

  def validated_svg_image_url
    convert_to_s3_accelerate_url(svg_image.url) if svg_image.present? && svg_image.url.present?
  end

  def validated_image_url
    if image.present?
      if standard_image_url.present?
        convert_to_s3_accelerate_url(standard_image_url)
      elsif image.url.present?
        convert_to_s3_accelerate_url(image.url) 
      end
    end
  end

  def floorplate_image_width
    self.width > 0 ? self.width : self.image.width rescue 0
  end

  def floorplate_image_height
    self.height > 0 ? self.height : self.image.height rescue 0
  end

  private


  def amenity_info amenity
    {
      id: amenity.id,
      unit_name: amenity.name,
      x_plot: amenity.x_plot,
      y_plot: amenity.y_plot,
    }
  end

  def unit_info unit
    {
      id: unit.id,
      unit_name: unit.name,
      x_plot: unit.x_plot,
      y_plot: unit.y_plot,
    }
  end

  def floorplate_amenities_info floor, floorplate_stops
    {
      id: self.id,
      name: self.name,
      floor_number: self.number,
      image: self.image,
      height: floorplate_image_height,
      width: floorplate_image_width,
      floor_range: self.range,
      floorplan_name: floor,
      unique_floorplat_amenity_identifier: "#{self.id}-#{floor}",
      floorplate_amenities: floorplate_stops
    }
  end

  def floorplate_units_info floor, floorplate_stops
    {
      id: self.id,
      name: self.name,
      floor_number: self.number,
      image: self.image,
      height: floorplate_image_height,
      width: floorplate_image_width,
      floor_range: self.range,
      floorplan_name: floor,
      unique_floorplat_unit_identifier: "#{self.id}-#{floor}",
      floorplate_units: floorplate_stops
    }
  end
end
