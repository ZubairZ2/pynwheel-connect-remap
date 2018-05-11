class Floorplate < ApplicationRecord
  include StandardUrl
  mount_uploader :image, SiteMapUploader
  belongs_to :community
  has_many :units
  has_many :amenities, as: :amenityable
  validates_uniqueness_of :name, scope: :community_id
  # validates_uniqueness_of :number, scope: :community_id
  validates :image, :presence => {message: "cannot be blank. Please upload Floor Plate image first."}
  validates_with FloorValidator
  before_destroy :reset_units_plots
  after_commit :populate_image_urls, on: [:create,:update]

  def reset_units_plots
    self.units.update_all(x_plot: 0,y_plot: 0, floorplate_id: nil)
  end

  def floors
    floors = []
    if range.include? '-'
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
