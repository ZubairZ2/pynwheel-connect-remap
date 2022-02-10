i = 0
json.tours @tours do |tour|
  json.id tour.id
  
  json.tour_key  @random_string
  json.community_id tour.community_id
  json.name tour.name
  json.is_sitemap @community.is_sitemap
  json.show_camera_button @community.show_camera_button
  json.show_notepad_button @community.show_notepad_button
  
  if @community&.tour&.tour_setting&.enable_restricted_property_access
    json.property_access @tour_user.restricted_property_access
    json.property_access_code @tour_user.property_access_code
  end

  json.allow_tours_customization @community&.tour&.tour_setting&.enable_tour_customization

  if @community&.tour&.tour_setting&.enable_tour_customization
    ind = 1
    json.unit_bedrooms @floorplans do |floorplan|
      json.id ind
      json.title (floorplan.bedrooms.present? ? (floorplan.bedrooms.to_i == 0 ? "Studio" : floorplan.bedrooms.to_i) : "")
      json.value floorplan.bedrooms.present? ? floorplan.bedrooms.to_i : ""
      json.is_selected false
      ind = ind + 1
    end

  else
    json.unit_bedrooms []
  end

end