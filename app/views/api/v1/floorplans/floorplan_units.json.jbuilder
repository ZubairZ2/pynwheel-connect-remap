json.success true
json.message "success"
json.floorplan do
  json.id @floorplan.id
  json.floorplan_name @floorplan.name
  json.bedrooms @floorplan.bedrooms rescue 0
  json.bathrooms @floorplan.bathrooms rescue 0
  json.square_feet @floorplan.square_feet
end
json.floorplates @floorplates do |floorplate|
  json.id floorplate.id
  json.name floorplate.name
  json.floor_number floorplate.number
  json.image floorplate.image
  json.height floorplate.height
  json.width floorplate.width
  json.floor_range floorplate.range
  json.floor_name floorplate.floor_name
  floorplate_range = floorplate.range.gsub('-', ',').split(',')
  units = []
  floorplate_floors = floorplate.floors
  floorplate_floors.each do |f|
    units << floorplate.units.available_units.where(floor: f, floorplan_id: @floorplan.provider_floorplan_id, community_id: @community.id)
  end
  json.floorplate_units units.flatten do |u|
    json.id u.id
    json.unit_name u.name
    json.unit_type u.unit_type
    json.x_plot u.x_plot
    json.y_plot u.y_plot
    json.floor u.floor
  end
  # units = @floorplate_units #@units.where('floor >= ? AND floor <= ?', floorplate_range.first, floorplate_range.last)
  # units = @units.where(floorplate_id: floorplate.id)
  
end
json.units @units do |u|
  json.id u.id
  json.community_id u.community_id
  json.floorplate_id u.floorplate_id
  json.floorplan_id u.floorplan_id
  tour_stop = TourStop.find_by(stop_id: u.id)
  json.is_unit_already_available tour_stop.present? ? true : false
  json.unit_name u.building.present? ? u.building + '-'+ u.marketing_name : u.marketing_name rescue u.marketing_name
  json.unit_type u.unit_type
  json.x_plot u.x_plot
  json.y_plot u.y_plot
  json.floor u.floor.present? ? u.floor : ""
  begin
    json.available_date u.available_date < Date.today + 1 ? "Now" : u.available_date.strftime("%d/%m/%y") #u.available_date.strftime("%m").to_i.to_s + "/" + u.available_date.strftime("%d").to_i.to_s
    json.available_date_for_filter u.available_date.strftime("%d/%m/%Y")
  rescue => ex
    json.available_date "N/A"
    json.available_date_for_filter "N/A"
  end
   
  json.building u.building.present? ? u.building : ""
  json.available u.available
  json.availability u.availability
  json.effective_rent u.effective_rent.to_i
  lease_pricing = []
  if u.lease_pricing.present?
    str_split = u.lease_pricing.split(';')
    str_split.each do |ss|
      str = ss.split(':')

      pricing_str = str[0]+" Month - $"+str[1].to_i.to_s
      lease_pricing << pricing_str


    end
    lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
    lease_pricing2 = []
    lease_pricing.each do |lp|
      lease_pricing2 << {"pricing_option" => lp}
    end
    lease_pricing = lease_pricing2
  else
    h = {"pricing_option" => "$"+ u.effective_rent.to_i.to_s}
    lease_pricing << h
  end
  json.lease_pricing lease_pricing
  json.description u.description
end
