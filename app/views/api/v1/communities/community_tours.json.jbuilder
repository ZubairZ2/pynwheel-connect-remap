json.tours @tours do |tour|

  json.id tour.id
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.x_plot tour.x_plot
  json.y_plot tour.y_plot
  json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)

  json.tour_stop tour.tour_stops do |stop|
    json.id stop.id
    json.latitude stop.latitude
    json.longitude stop.longitude
    json.type stop.stop_type
    if stop.stop_type == "unit"
      unit = Unit.find stop.stop_id
      json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
      json.stop_data ["marketing_name" => unit.marketing_name,"floorplan" => unit.floorplan_id,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"availability" => unit.availability]
      @unit_amenities = Amenity.where(community_id: @community.id, amenityable_type: "Unit", amenityable_id: stop.stop_id)
      json.unit_amenities @unit_amenities do |unit_amenity|
        json.amenity_image unit_amenity.image.present? ? unit_amenity.image : "no image"
        json.amenity_x_plot unit_amenity.x_plot
        json.amenity_y_plot unit_amenity.y_plot
      end
    elsif stop.stop_type == "amenity"
      amenity = Amenity.find stop.stop_id
      json.image amenity.image.present? ? amenity.image.url : "no image"
    end
    stop.stop_details.each do |sd|
      json.stop_description sd.description
    end
    stop.stop_galleries.each do |sg|
      json.stop_gallery_name sg.name
      json.stop_galerry_image sg.image.present? ? sg.image.url : "no image"
    end
  end

end