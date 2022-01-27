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
  # has_paper_trail
  include StandardUrl
  serialize :map_ocr_data, Array

  mount_uploader :image, SiteMapUploader

  belongs_to :community
  has_many :units, dependent: :destroy
  has_many :amenities, as: :amenityable
  has_many :elevators, dependent: :destroy
  has_many :hallways, as: :parent
  has_many :access_points, class_name: 'Door', as: :attached_with, dependent: :destroy

  validates_uniqueness_of :name, scope: :community_id
  validates :image, :presence => {message: "cannot be blank. Please upload Floor Plate image first."}
  validates_with FloorValidator

  before_destroy :reset_units_plots
  after_commit :populate_image_urls, on: [:create,:update]

  def get_floorplate_units_data floor, provider_floorplan_id, community_id
    units = self.units.available_units.where(floor: floor, floorplan_id: provider_floorplan_id, community_id: community_id)
    floorplate_units = []

    units.each do |unit|
      floorplate_units << unit_info(unit)
    end

    floorplate_units.present? ? floorpat_info(floor, floorplate_units) : nil
  end

  def unit_info unit
    {
      id: unit.id,
      unit_name: unit.name,
      unit_type: unit.unit_type,
      x_plot: unit.x_plot,
      y_plot: unit.y_plot,
      floor: unit.floor,
      building: unit.building
    }
  end

  def floorpat_info floor, floorplate_units
    {
      id: self.id,
      name: self.name,
      floor_number: self.number,
      image: self.image,
      height: self.height,
      width: self.width,
      floor_range: self.range,
      floorplan_name: floor,
      building: self.building,
      unique_floorplat_unit_identifier: "#{self.id}-#{floor}",
      floorplate_units: floorplate_units
    }
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
    units = Unit.where(community_id: community_id,floor: self.floors)
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

end
