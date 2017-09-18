class Unit < ApplicationRecord
  belongs_to :community
  belongs_to :floorplan

  def floorplan
    Floorplan.find_by(provider_floorplan_id: self.floorplan_id)
  end
end
