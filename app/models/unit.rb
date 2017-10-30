class Unit < ApplicationRecord
  belongs_to :community
  belongs_to :floorplan
  belongs_to :floorplate
  validates :effective_rent, :numericality => { :greater_than => 0 }
  has_many :amenities, as: :amenityable

  def floorplan
    Floorplan.find_by(provider_floorplan_id: self.floorplan_id)
  end
end
