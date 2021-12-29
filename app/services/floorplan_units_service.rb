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

  def get_floorplan_units(floorplan)
    Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', floorplan.provider_floorplan_id,@community.id,true) if floorplan.present?
  end

  def get_floorplates
    if @community.has_floorplates?
      @floorplates = @community.floorplates
      @floors = @floorplates.map{|f| f.floors}.flatten.sort_by { |f| f }
      floorplates = []
      @floors.each do |floor|
        floorplates << @floorplates.select{|f| f.floors.include?(floor)}
      end
      floorplates.flatten.uniq
    end
  end

end