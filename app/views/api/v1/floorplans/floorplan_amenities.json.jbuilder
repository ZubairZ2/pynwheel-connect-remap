json.success true
json.message "success"

floorplates_obj = []

unless @community.is_sitemap
  @floorplates.uniq.each do |floorplate|
    floorplate.floors.each do |f|
      floorplates_obj << floorplate.get_floorplate_amenities_data(f, @community.id)
    end
  end

else
  floorplates_obj << @community.sitemap.get_sitemap_amenities_data(@amenities)
end

json.floorplates floorplates_obj.compact

json.amenities @amenities do |amenity|
  tour_stop =  TourStop.where(display_stop: true , stop_id: amenity.id, tour_id: @tour.id).last

  json.id amenity.id
  json.community_id amenity.community_id
  json.floorplate_id amenity.amenityable_id
  json.is_amenity_already_available tour_stop.present? ? true : false
  json.amenity_name amenity.name
  json.amenity_type amenity.amenity_type
  json.x_plot amenity.x_plot
  json.y_plot amenity.y_plot
  json.floor amenity.floor.present? ? amenity.floor : ""
  json.building amenity.building.present? ? amenity.building : ""
  json.unique_amenity_identifier @community.is_sitemap ? "#{amenity&.amenityable_id}" : "#{amenity&.amenityable_id}-#{amenity.floor}"
  json.description amenity.description
  json.image amenity.image
  json.amenity_galleries amenity.get_amenity_galleries()
end
