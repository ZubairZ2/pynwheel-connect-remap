json.floorplans @floorplans do |floorplan|
	json.id floorplan.id
	json.name floorplan.name + "- #{(floorplan.bedrooms.present? ? (floorplan.bedrooms.to_i.to_s + " BR") : "") } / #{(floorplan.bathrooms.present? ? (floorplan.bathrooms.to_i.to_s + " BA") : "" )}"
	json.bedrooms_bathrooms (floorplan.bedrooms.present? ? (floorplan.bedrooms.to_i.to_s + " Bedroom  ") : "") + (floorplan.bathrooms.present? ? (floorplan.bathrooms.to_i.to_s + " Bathroom") : "" )
	json.square_footage (floorplan.square_feet.present? ? floorplan.square_feet.to_i.to_s + " Square Footage" : "")
	json.availability_url floorplan.availability_url
	json.thumbnail_image floorplan.image.present? ? floorplan.image.url : ""
	floorplan_images = []
	floorplan.image.present? ? (floorplan_images << {imageURL: floorplan.image.url}) : ""
	floorplan.secondary_image.present? ? (floorplan_images << {imageURL: floorplan.secondary_image.url}) : ""
	json.floorplan_images floorplan_images
end