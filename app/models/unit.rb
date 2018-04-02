class Unit < ApplicationRecord
  mount_uploader :image, AvatarUploader
  belongs_to :community
  belongs_to :floorplan
  belongs_to :floorplate
  #has_many :favorites
  #has_many :favorite_communities, :through => :favorites,source: :community
  validates :effective_rent, :numericality => { :greater_than => 0, :less_than => 1000000 }, :length => { :maximum => 10}
  validates_uniqueness_of :marketing_name, scope: :community_id
  has_many :amenities, as: :amenityable

  scope :available_units, -> { where(availability: "Unoccupied") }

  def floorplan
    Floorplan.find_by(provider_floorplan_id: self.floorplan_id, community_id: self.community_id)
  end

  def unit_image
    self.image.present? ? self.image.url : (self.floorplan.present? && self.floorplan.image.present? ? self.floorplan.image.url : "default.jpeg")
  end

  # def is_favorite?
  #   favorite_communities.count > 0
  # end
end
