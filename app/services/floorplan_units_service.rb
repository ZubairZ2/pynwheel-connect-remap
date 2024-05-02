class FloorplanUnitsService < BaseService
  def initialize(community)
    @community = community
  end

  def get_floorplans
    units = @community.available_unit_for_self_tour()
    units.map(&:floorplan).compact
  end
  
  def get_floorplan_units(floorplan)
    units = Unit.where(floorplan_id: floorplan.provider_floorplan_id, community_id: @community.id, available: true)

    if floorplan.present?
      if SELF_TOUR_PROVIDERS.include?(@community.data_provider)
        units = units.vacant_and_available
      end

      unless @community.is_sitemap
        units = units.where.not(floor: not_floor, building: not_building)
      end
    else
      units = []
    end

    units
  end

  def get_floorplate_amenities
    @community.property_availbale_amenities
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