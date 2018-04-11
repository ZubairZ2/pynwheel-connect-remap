class Unit < ApplicationRecord
  mount_uploader :image, AvatarUploader
  belongs_to :community
  belongs_to :floorplan
  belongs_to :floorplate
  #has_many :favorites
  #has_many :favorite_communities, :through => :favorites,source: :community
  validates :effective_rent, :numericality => { :greater_than => 0, :less_than => 1000000 }, :length => { :maximum => 10}
  validates_uniqueness_of :provider_unit_id, scope: :community_id
  has_many :amenities, as: :amenityable

  # scope :available_units, -> { where(availability: "Unoccupied") }
  scope :past_available_units, -> { where("availability = ? and available_date <= ? and x_plot > ?", "Unoccupied", Date.today, 0) }
  scope :has_x_plot, -> { where("x_plot > ? and available_date > ?", 0, Date.today) }
  scope :has_y_plot, -> { where("y_plot > ? and available_date > ?", 0, Date.today) }
  scope :ploted_units, -> { has_x_plot.or(has_y_plot) }
  scope :available_units, -> { ploted_units.or(past_available_units) }

  def floorplan
    Floorplan.find_by(provider_floorplan_id: self.floorplan_id, community_id: self.community_id)
  end

  def unit_image
    self.image.present? ? self.image.url : (self.floorplan.present? && self.floorplan.image.present? ? self.floorplan.image.url : "/assets/default.jpeg")
  end

  # def is_favorite?
  #   favorite_communities.count > 0
  # end
end
