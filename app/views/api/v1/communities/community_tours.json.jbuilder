i = 0
json.tours @tours do |tour|
  json.id tour.id
  
  json.tour_key  @random_string
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.x_plot tour.x_plot
  json.y_plot tour.y_plot
  json.is_sitemap @community.is_sitemap
  json.show_camera_button @community.show_camera_button
  json.show_notepad_button @community.show_notepad_button
  json.property_access @community&.community_tour&.tour_setting&.enable_restricted_property_access ? @tour_user.restricted_property_access : false
  json.property_access_code @tour_user.property_access_code.present? ? @tour_user.property_access_code : "" 
  
  json.tour_setting do
    json.show_map @community.show_map
    json.mdu @community.mdu
  end

  if @community.is_sitemap
    json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url) rescue ""

  else
    @floorplate = @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    json.image @floorplate.image rescue "no image"

  end

  fs = @community.favorite_stop.present? ? @community.favorite_stop : FavoriteStop.new
  
  favorite_unit_array = (fs.present? ? fs.favorite_unit : []) + (fs.user_favorites_unit[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_unit[@tour_user.email] : [])
  favorite_amenity_array = (fs.user_favorites_amenity[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_amenity[@tour_user.email] : [])

  stops_arr = []

  scheduled_tour_stops = @community.community_tour_available_stops(@tour_user, tour)
  add_start = true

  if @community.is_sitemap
    if scheduled_tour_stops.present?
      stops_arr = @community.mdu ? scheduled_tour_stops : scheduled_tour_stops.where.not(stop_type: "unit").order(:sort)
    else
      stops_arr =  @community.mdu ? @community.community_tour.tour_stops.plotted_stops.where(display_stop: true).order(:sort) : @community.community_tour.tour_stops.plotted_stops.where(display_stop: true, stop_type: "amenity").order(:sort)
    end
  else

    if scheduled_tour_stops.present?
      stops_arr = @community.mdu ? scheduled_tour_stops : scheduled_tour_stops.where.not(stop_type: "unit").order(:sort)
      
    else
      @building_list << "" if @building_list == []
      @building_list.each do |building|
        @floor_list_loop = (@floor_list_temp.present? && add_start) ? @floor_list_temp : @floor_list
        add_start = false
        @floor_list_loop.each do |floor|
          if @community.community_tour.sort_hash[building + ","+ floor.to_s].present?
            @community.community_tour.sort_hash[building + ","+ floor.to_s].each do |s_id|
              if (s_id.present?)
                stop = (TourStop.find_by_id(s_id))
                stops_arr << stop if (stop.display_stop && (@community.mdu ? true : (stop.stop_type != "unit")) ) rescue next
              end
            end
          end
        end
      end
    end
  end


  stops_arr = @community.filter_final_stops(stops_arr.compact)

  json.tour_stop stops_arr.distinct.compact.each do |stop|
    unless stop.stop_type == "elevator" || (stop.latitude.present? && (stop.latitude + stop.longitude) < 1) && @community.show_map
      
      if stop.stop_type == "unit"
        u = Unit.find_by_id stop.stop_id
        if u.present? && (u.available || u.modal_unit)
          json.name u.api_unit_marketing_name + ((u&.floorplan&.bedrooms.present? ? " (" + u&.floorplan&.bedrooms.to_i.to_s + " BR)" : "") rescue "")
          json.is_favorite favorite_unit_array.include?(stop.stop_id.to_s) ? true : false
        else
          next
        end
      else
        json.name stop.name
        json.is_favorite favorite_amenity_array.include?(stop.stop_id.to_s) ? true : false
      end
      json.id stop.id
      json.type stop.stop_type
    end
  end
end