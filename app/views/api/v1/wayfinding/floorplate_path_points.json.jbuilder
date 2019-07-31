json.floorplat @floorplate
json.path_points @existing_path_points do |point|
	json.id point.id
	json.x point.x
	json.y point.y
	json.neighbour_units point.neighbour_units do |nu|
		unit = Unit.find_by_id(nu.unit_id)
		if unit.present?
			json.unit_id unit.id
			json.x_plot unit.x_plot
			json.y_plot unit.y_plot
		end
	end
end