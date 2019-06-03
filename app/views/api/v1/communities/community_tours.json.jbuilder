json.tours @tours do |tour|

  json.id tour.id
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.image tour.image

  json.tour_stop tour.tour_stops do |stop|
    json.id stop.id
    json.latitude stop.latitude
    json.longitude stop.longitude
    json.type stop.stop_type
    if stop.stop_type == "unit"
      unit = Unit.find stop.stop_id
      json.stop_data ["marketing_name" => unit.marketing_name,"floorplan" => unit.floorplan_id,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"availability" => unit.availability]
      json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
    elsif stop.stop_type == "amenity"
      amenity = Amenity.find stop.stop_id
      json.image amenity.image.present? ? amenity.image.url : "no image"
    end
    
  end

end