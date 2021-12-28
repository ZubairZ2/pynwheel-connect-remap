class FloorplanUnitsService < BaseService
  def initialize(community)
    @community = community
  end

  def get_floorplans
    units = @community.units.where(available: true)
    floorplans = []
    units.each do |u|
      floorplans << u.floorplan
    end
    floorplans.compact
  end

  def get_floorplan_units(floorplan_id)
    floorplan = Floorplan.find_by_id(floorplan_id)
    Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', floorplan.provider_floorplan_id,@community.id,true) if floorplan.present?
  end

end