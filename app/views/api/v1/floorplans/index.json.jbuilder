json.floorplans @floorplans do |floorplan|
    available_units = Unit.where(floorplan_id: floorplan.provider_floorplan_id, available: true)
	json.id floorplan.id
	json.name floorplan.name
	json.bedrooms (floorplan.bedrooms.present? ? (floorplan.bedrooms.to_i.to_s + " Bed") : "")
    json.bathrooms (floorplan.bathrooms.present? ? (floorplan.bathrooms.to_i.to_s + " Bath") : "" )
	json.square_footage (floorplan.square_feet.present? ? floorplan.square_feet.to_i.to_s + " Square Feet" : "")
    if available_units.present?
        json.vacant_units available_units.count
        availability = available_units.pluck(:available_date).max
        json.availability availability <= Date.today ? "Now" : availability
        json.up_to "$"+available_units.pluck(:min_effective_rent).compact.min.to_i.to_s+"/month"
        available_buildings = available_units.pluck(:building).reject { |c| c.empty? }
        available_floors = available_units.pluck(:floor).compact.uniq.sort
        json.buildings available_buildings.present? ? available_buildings.uniq.join(', ') : "" 
        json.floors available_floors.present? ? available_floors.join(', ') : ""
    end
	json.thumbnail_image floorplan.image.present? ? floorplan.image.url : ""
	floorplan_images = []
	floorplan.image.present? ? (floorplan_images << {imageURL: floorplan.image.url}) : ""
	floorplan.secondary_image.present? ? (floorplan_images << {imageURL: floorplan.secondary_image.url}) : ""
	json.floorplan_images floorplan_images
end