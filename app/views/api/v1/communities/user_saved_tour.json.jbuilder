json.name @tour_user.name
json.phone_number @tour_user.phone_number
json.email @tour_user.email
@tours = { [@tours.keys.last[0],@tours.keys.last[1]] => @tours.values.last}
# @tours = @tours.last
json.tours @tours do |tour|
  tour_key = tour[0][1]
  tour = Tour.find tour[0][0]
  @community = Community.find tour.community_id
  json.id tour.id
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.x_plot tour.x_plot
  json.y_plot tour.y_plot
  json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)

  visited_stops = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_key: tour_key,device_id: @device_id).group('tour_stop_id').count

  json.visited_tour visited_stops do |visited_stop|
    @tour = TourStop.find visited_stop[0]

    json.id @tour.id
    # @tour = TourStop.find visited_stop[0]
    json.type @tour.stop_type
    if @tour.stop_type == "unit"
      unit = Unit.find @tour.stop_id
      json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
      json.name "Unit "+unit.marketing_name
      stop_dat = {"floorplan" => unit.floorplan_id,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"availability" => unit.availability,"stop_description" => unit.stop_description}
      json.stop_data stop_dat
      @unit_amenities = Amenity.where(community_id: (Tour.find @tour.tour_id).community_id, amenityable_type: "Unit", amenityable_id: @tour.stop_id)
      json.unit_amenities @unit_amenities do |unit_amenity|
        json.x_plot unit_amenity.x_plot
        json.y_plot unit_amenity.y_plot
        json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"
        json.stop_description unit_amenity.description
        @unit_gallery_arr = []
        unit_amenity.amenity_galleries.each do |ag|
          @unit_gallery_arr << ag
          # json.name ag.name
          # json.image ag.image.url
          # json.description ag.description
        end
      end
      json.amenity_gallery @unit_gallery_arr do |ag|
        json.name ag.name
        json.image ag.image.url
        json.description ag.description
      end
    elsif @tour.stop_type == "amenity"
      amenity = Amenity.find @tour.stop_id
      json.image amenity.image.present? ? amenity.image.url : "no image"
      json.stop_description amenity.description
      json.amenity_gallery amenity.amenity_galleries do |ag|
        json.name ag.name
        json.type "unit_stop"
        json.image ag.image.url
        json.description ag.description
      end
    end
    # user_data = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_stop_id: @tour.id)
    user_gallery = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_stop_id: @tour.id,device_id: @device_id).where.not(image: nil)
    gallery_arr = []
    user_gallery.each do |ud|
      gallery_arr << ud.image.url
      # json.image ud.image.url
    end
    json.user_gallery gallery_arr
    user_notes = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id,tour_stop_id: @tour.id,device_id: @device_id).where.not(description: nil)
    description_arr = []
    user_notes.each do |un|
      description_arr << un.description
      # json.description un.description
    end
    json.notes description_arr
  end

end

