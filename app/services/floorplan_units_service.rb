class FloorplanUnitsService < BaseService
  def initialize(community)
    @community = community
  end

  def get_floorplans
    units = @community.units.available_units

    floorplans = []
    units.each do |u|
      floorplans << u.floorplan
    end
    
    floorplans.compact
  end

  def get_floorplan_units(floorplan)
    unless @community.is_sitemap
      Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', floorplan.provider_floorplan_id, @community.id, true).available_units.where.not(floor: not_floor, building: not_building) if floorplan.present?
    else
      Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', floorplan.provider_floorplan_id, @community.id, true).available_units if floorplan.present?
    end
  end

  def get_floorplate_amenities
    unless @community.is_sitemap
      @community.amenities.where(amenityable_type: "Floorplate").where.not(x_plot: [0,nil], y_plot: [0,nil], floor: not_floor, building: not_building).sort_by { |a| a&.floor } 
    else
      @community.amenities.where(amenityable_type: "Sitemap").where.not(x_plot: [0,nil], y_plot: [0,nil])
    end
  end

  def get_floorplates
    if @community.has_floorplates?
      @floorplates = @community.floorplates
      @floors = fetch_floors()
      floorplates = []
      @floors.each do |floor|
        floorplates << @floorplates.select{|f| f.floors.include?(floor)}
      end
      floorplates.flatten
    end
  end

  def fetch_floors
    floorplates = @community.floorplates
    floors = floorplates.map{|f| f.floors}.flatten.sort_by { |f| f }
    floors.uniq
  end

  private

  def not_floor
    [nil]
  end

  def not_building
    ["", nil, "N/A"]
  end
end