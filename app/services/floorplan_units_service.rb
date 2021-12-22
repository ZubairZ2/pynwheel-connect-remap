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
    floorplans.present? ? floorplans.compact.sort_by { |f| f.bedrooms }.uniq { |b| b.bedrooms } : []
  end

end