json.floorplans @floorplans do |floorplan|
	json.id floorplan.id
	json.name floorplan.name + "- #{floorplan.bedrooms} BR / #{floorplan.bathrooms} BA"
	json.bedrooms floorplan.bedrooms
	json.bathrooms floorplan.bathrooms
	json.availability_url floorplan.availability_url
	json.image floorplan.image.present? ? floorplan.image.url : ""
	json.secondary_image floorplan.secondary_image.present? ? floorplan.secondary_image.url : ""
end