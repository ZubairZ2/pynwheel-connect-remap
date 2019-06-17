json.name @tour_user.name
json.phone_number @tour_user.phone_number
json.email @tour_user.email

json.visited_tour @tour_user.visited_stops do |visited_stop|
  @tour = TourStop.find visited_stop.tour_stop_id

  json.id visited_stop.id

  json.type @tour.stop_type
  if @tour.stop_type == "unit"
    unit = Unit.find @tour.stop_id
    json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
    json.stop_data ["marketing_name" => unit.marketing_name,"floorplan" => unit.floorplan_id,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"availability" => unit.availability,"stop_description" => unit.stop_description]
    @unit_amenities = Amenity.where(community_id: (Tour.find @tour.tour_id).community_id, amenityable_type: "Unit", amenityable_id: @tour.stop_id)
    json.unit_amenities @unit_amenities do |unit_amenity|
      json.x_plot unit_amenity.x_plot
      json.y_plot unit_amenity.y_plot
      json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"
      json.stop_description unit_amenity.stop_description
      json.amenity_gallery unit_amenity.amenity_galleries do |ag|
        json.name ag.name
        json.image ag.image.url
        json.description ag.description
      end
    end
  elsif @tour.stop_type == "amenity"
    amenity = Amenity.find @tour.stop_id
    json.image amenity.image.present? ? amenity.image.url : "no image"
    json.stop_description amenity.stop_description
    json.amenity_gallery amenity.amenity_galleries do |ag|
      json.name ag.name
      json.type "unit_stop"
      json.image ag.image.url
      json.description ag.description
    end
  end
end
