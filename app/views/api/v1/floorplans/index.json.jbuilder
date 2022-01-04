json.floorplans @floorplans do |floorplan|
  available_units = FloorplanUnitsService.new(@community).get_floorplan_units(floorplan) #Unit.where(floorplan_id: floorplan.provider_floorplan_id, available: true).where.not(x_plot: 0, y_plot: 0)
	if available_units.count.to_i > 0
    json.id floorplan.id
    json.name floorplan.name
    json.bedrooms (floorplan.bedrooms.present? ? (floorplan.bedrooms.to_i.to_s + " Bed") : "")
    json.bathrooms (floorplan.bathrooms.present? ? (floorplan.bathrooms.to_i.to_s + " Bath") : "" )
    json.square_footage (floorplan.square_feet.present? ? floorplan.square_feet.to_i.to_s + " Square Feet" : "")
    # if available_units.present?
      json.vacant_units available_units.present? ? available_units.count : 0
      availability = available_units.pluck(:available_date).compact.max rescue ""
      json.availability availability.present? ? availability <= Date.today ? "Now" : availability : ""
      json.up_to availability.present? ? "$"+available_units.pluck(:min_effective_rent).compact.min.to_i.to_s+"/month" : ""
      available_buildings = available_units.pluck(:building).compact.reject { |c| c.empty? } rescue ""
      available_floors = available_units.pluck(:floor).compact.uniq.sort rescue ""
      json.buildings available_buildings.present? ? available_buildings.uniq.join(', ') : "" 
      json.floors available_floors.present? ? available_floors.join(', ') : ""
    # end
    json.thumbnail_image floorplan.image.present? ? floorplan.image.url : ""
    floorplan_images = []
    floorplan.image.present? ? (floorplan_images << {id: 1, url: floorplan.image.url}) : ""
    floorplan.secondary_image.present? ? (floorplan_images << {id: 2, url: floorplan.secondary_image.url}) : ""
    json.floorplan_images floorplan_images
  end
end
json.pagination do
  current, total, per_page = @floorplans.current_page, @floorplans.total_pages, @floorplans.limit_value
  json.current_page current
  json.previous (current > 1 ? (current - 1) : 0)
  json.next (current == total ? 0 : (current + 1))
  json.per_page per_page
  json.pages total
  json.total_records @floorplans.total_count
end