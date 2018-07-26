class Unit < ApplicationRecord
  include StandardUrl
  mount_uploader :image, AvatarUploader
  belongs_to :community
  belongs_to :floorplan
  belongs_to :floorplate
  validates :effective_rent, :numericality => { :greater_than => 0, :less_than => 1000000 }, :length => { :maximum => 10}
  validates_uniqueness_of :provider_unit_id, scope: :community_id
  validates_uniqueness_of :marketing_name, scope: :community_id
  has_many :amenities, as: :amenityable

  # scope :available_units, -> { where(availability: "Unoccupied") }
  scope :past_available_units, -> { where("availability = ? and available_date <= ? and x_plot > ?", "Unoccupied", Date.today, 0) }
  scope :has_x_plot, -> { where("x_plot > ? and available_date > ? and available_date < ?", 0, Date.today, Date.today+1.year) }
  scope :has_y_plot, -> { where("y_plot > ? and available_date > ? and available_date < ?", 0, Date.today, Date.today+1.year) }
  scope :ploted_units, -> { has_x_plot.or(has_y_plot) }
  scope :available_units, -> { ploted_units.or(past_available_units) }
  after_commit :populate_image_urls, on: [:create,:update]
  after_update_commit :set_manually_updated_column
  
  def set_manually_updated_column
    self.update_attribute(:manually_updated, true)
    if attributes["sold"]
      self.update_attribute(:available, false)
      self.update_attribute(:availability, "Occupied")
      self.update_attribute(:available_date, nil)
    end
  end

  def floorplan
    Floorplan.find_by(provider_floorplan_id: self.floorplan_id, community_id: self.community_id)
  end

  def unit_image
    self.image.present? ? self.image.url : (self.floorplan.present? && self.floorplan.image.present? ? self.floorplan.image.url : "/assets/default.jpeg")
  end

  def populate_image_urls
    if image.present?
      set_standard_url('Unit',id)
    end
  end
end
