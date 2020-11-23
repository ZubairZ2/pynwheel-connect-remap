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
  # @community.is_sitemap ? sp = Path.where(map_path_from_id: tour.tour_stops&.order(:sort)&.last&.stop_id, map_path_to_id: nil)&.first : sp = Path.where(map_path_from_id: tour.tour_stops.where(stop_type: "elevator").first.stop_id, map_path_to_id: nil)&.first
  # if sp.blank?
  #   @community.is_sitemap ? sp = Path.where(map_path_from_id: nil, map_path_to_id: tour.tour_stops&.order(:sort)&.last&.stop_id)&.first : sp = Path.where(map_path_from_id: nil, map_path_to_id: tour.tour_stops.where(stop_type: "elevator").first.stop_id)&.first
  #   json.path_points sp.present? ? sp.path_points.reorder('id DESC') : []
  # else
  #   json.path_points sp.present? ? sp.path_points.reorder('id ASC') : []
  # end

  stops_arr = []
  add_start = true
  if @community.is_sitemap
    stops_arr = @community.mdu ? @community.tour.tour_stops.where(display_stop: true).order(:sort) :  @community.tour.tour_stops.where(display_stop: true,stop_type: "amenity").order(:sort)
  else
    @building_list << "" if @building_list == []
    @building_list.each do |building|
      @floor_list_loop = (@floor_list_temp.present? && add_start) ? @floor_list_temp : @floor_list
      add_start = false
      @floor_list_loop.each do |floor|
        if @community.tour.sort_hash[building + ","+ floor.to_s].present?
          @community.tour.sort_hash[building + ","+ floor.to_s].each do |s_id|
            if (s_id.present?)
              stop = (TourStop.find_by_id(s_id))
              stops_arr << stop if (stop.display_stop && (@community.mdu ? true : (stop.stop_type != "unit")) ) rescue next
            end
          end
        end
      end
    end
    # last_stop = stops_arr[stops_arr.size - 1]
    # min_floor = @community.floorplates.map{|f| f.floors}.flatten.min
    # sto = last_stop.stop_type.classify.constantize.find_by_id(last_stop.stop_id)
    # max_floor = sto.is_a?(Amenity) ? sto.amenityable.floors.max : sto.floorplate.floors.max
    # @plates = []
    # @ele_ = []
    # Floorplate.where(community_id: @community.id).each{|x| @plates << x}
    # @plates.each do |pl|
    #   floor_pl = Floorplate.find pl
    #   Elevator.where(floorplate_id: pl).map{|x| @ele_ << x}
    # end
    # while min_floor != max_floor do
    #   ele = @ele_.map{|x| x if x.floors.include?(max_floor)}.compact.first
    #   unless ele.present?
    #     break;
    #   end
    #   max_floor = ele.floors.min
    #   stops_arr << TourStop.find_by(stop_id: ele.id)
    # end
  end
  #
  # new_stops_arr = []
  # last_element  = nil
  # stops_arr.each do |x|
  #   if last_element != x
  #     new_stops_arr << x
  #   end
  #   last_element = x
  # end
  # new_stops_arr

  json.tour_stop stops_arr.compact.each do |stop|
    unless stop.stop_type == "elevator" || (stop.latitude.present? && (stop.latitude + stop.longitude) < 1) && @community.show_map
      
      if stop.stop_type == "unit"
        u = Unit.find stop.stop_id
        if u.present? && (u.available and u.available_date >= Date.today)
          
          # if @tour_user.desired_bedroom.present? and (tour.tour_setting.present? ? (tour.tour_setting.show_desired_bedroom.nil? ? true : tour.tour_setting.show_desired_bedroom) : false)
          #   unless u.floorplan.bedrooms.to_i == @tour_user.desired_bedroom.to_i
          #     next
          #   end
          # end
          json.name (u.building.present? ? (u.building + "-") : "") + u.marketing_name + ((u.floorplan.bedrooms.present? ? " (" + u.floorplan.bedrooms.to_i.to_s + " BR)" : "") rescue "")
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


  # stops = []
  # stop2 = []
  # @community.floorplates.map{|f| f.floors}.flatten.sort.each do |floor|
  #   @floorplate_ = @community.floorplates.select{|f| f.floors.include?(floor.to_i)}.first
  #   @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id} & @floorplate_.amenities.map{|x| x.id}
  #   @tour_unit_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}  & @floorplate_.units.map{|x| x.id if x.floor == @floor.to_i}
  #   @all_stops = @tour_amenity_array | @tour_unit_array | @floorplate_.elevators.map{|f| f.id if f.floors.include?(floor.to_i)}
  #
  #   @all_stops = @all_stops.compact
  #   # @all_stops.each{|f| stops << TourStop.find_by(stop_id: f) }
  #
  #   stops << @all_stops
  #   @community.tour.tour_stops.order(:sort).each do |ts|
  #     stop2 << ts if stops.include?
  #   end
  #   # stops.compact.sort_by(&:sort)
  #   # stops.each{|f| stop2 << f }
  # end
  # @community.floorplates.map{|f| f.floors}.flatten.sort.each do |f|
  #   @community.tour.tour_stops.order(:sort).each do |ts|
  #     stop2 if stops.include?
  #   end
  # end
  #
  # stop2 = stop2.compact

  # stops = tour.tour_stops.map{|x| x.stop_id @te << x.stop_type.classify.constantize.find_by_id(x.stop_id)}
  # json.tour_stop new_stops_arr.compact do |stop|
  #   json.id stop.id
  #   json.x_plot stop.latitude
  #   json.y_plot stop.longitude
  #   json.unit_id stop.stop_id
  #   if params[:testing].present?
  #     if stop.stop_type == 'amenity' then json.type 'elevator' else json.type stop.stop_type end
  #   else
  #     json.type stop.stop_type
  #   end
  #   if stop.stop_type == "unit"
  #     unit = Unit.find_by_id stop.stop_id
  #     json.image unit.present? ? (unit.image.present? ? unit.image.url: (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
  #     json.name  "Apartment "+unit.marketing_name
  #     json.floorplate_image (unit.floorplate.image.present? ? unit.floorplate.image.url : nil) if unit.floorplate.present?
  #     lease_pricing = []
  #     if unit.lease_pricing.present?
  #       str_split = unit.lease_pricing.split(';')
  #       str_split.each do |ss|
  #         str = ss.split(':')
  #
  #         pricing_str = str[0]+" Month - $"+str[1]
  #         # h = {"pricing_option" => pricing_str}
  #         lease_pricing << pricing_str
  #
  #       end
  #       lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
  #       lease_pricing2 = []
  #       lease_pricing.each do |lp|
  #         lease_pricing2 << {"pricing_option" => lp}
  #       end
  #       lease_pricing = lease_pricing2
  #     else
  #       h = {"pricing_option" => "$"+ unit.effective_rent.to_s}
  #       lease_pricing << h
  #     end
  #     stop_dat = {"floorplan" => Floorplan.find_by(id: unit.floorplan.id).name,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"lease_pricing" => lease_pricing,"availability" => unit.availability,"stop_description" => unit.stop_description, "availability_url"=> unit.availability_url.present? ? unit.availability_url :  Floorplan.find_by(provider_floorplan_id: unit.floorplan_id).availability_url}
  #     json.stop_data stop_dat
  #     @unit_amenities = unit.amenities #Amenity.where(community_id: @community.id, amenityable_type: "Unit", amenityable_id: stop.stop_id)
  #     json.unit_amenities @unit_amenities.order(:sort) do |unit_amenity|
  #       if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
  #         json.x_plot unit_amenity.x_plot
  #         json.y_plot unit_amenity.y_plot
  #         json.name unit_amenity.name
  #         json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"
  #         json.stop_description unit_amenity.description
  #         json.directional_text unit_amenity.directional_text
  #         if unit_amenity.amenity_galleries.count == 0
  #           # temp_data = {"name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description}
  #           json.gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description, "directional_text" => unit_amenity.directional_text]
  #         else
  #
  #           amenityGalleryArr = []
  #           # unit_amenity.description = nil
  #           amenityGalleryArr << unit_amenity
  #           unit_amenity.amenity_galleries.each do |amen|
  #             amenityGalleryArr << amen
  #           end
  #           json.gallery amenityGalleryArr do |ag|
  #             json.name ag.name
  #             json.image ag.image.url
  #             json.description ag.description
  #             json.directional_text ag.directional_text
  #           end
  #         end
  #
  #       end
  #     end
  #   elsif stop.stop_type == "elevator"
  #     elevator = Elevator.find_by_id stop.stop_id
  #     json.image elevator.image.present? ? elevator.image.url : asset_path("elev2.png")
  #     json.stop_description elevator.description
  #     json.name elevator.name
  #     json.directional_text elevator.directional_text
  #     json.floorplate_image (elevator.floorplate.image.present? ? elevator.floorplate.image.url : nil) if elevator.floorplate.present?
  #     if elevator.elevator_galleries.count == 0
  #       json.gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator.description, "directional_text" => elevator.directional_text]
  #     else
  #       # json.elevator_gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator.description]
  #
  #       elevatorGalleryArr = []
  #       # elevator.description = nil
  #       elevatorGalleryArr << elevator
  #       elevator.elevator_galleries.each do |amen|
  #         elevatorGalleryArr << amen
  #       end
  #       json.gallery elevatorGalleryArr do |ag|
  #         json.name ag.name
  #         json.type "unit_stop"
  #         json.image ag.image.url
  #         json.description ag.description
  #         json.directional_text ag.directional_text
  #       end
  #     end
  #
  #   elsif stop.stop_type == "amenity"
  #     amenity = Amenity.find stop.stop_id
  #     json.image amenity.image.present? ? amenity.image.url : "no image"
  #     json.stop_description amenity.description
  #     json.name amenity.name
  #     json.directional_text amenity.directional_text
  #     json.floorplate_image (amenity.amenityable.image.present? ? amenity.amenityable.image.url : nil) if amenity.amenityable.present?
  #     if amenity.amenity_galleries.count == 0
  #       json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description, "directional_text" => amenity.directional_text]
  #     else
  #       # json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description]
  #
  #       amenityGalleryArr = []
  #       # amenity.description = nil
  #       amenityGalleryArr << amenity
  #       amenity.amenity_galleries.each do |amen|
  #         amenityGalleryArr << amen
  #       end
  #       json.gallery amenityGalleryArr do |ag|
  #         json.name ag.name
  #         json.type "unit_stop"
  #         json.image ag.image.url
  #         json.description ag.description
  #         json.directional_text ag.directional_text
  #       end
  #     end
  #   end
  #   # binding.pry
  #
  #   stop.stop_details.each do |sd|
  #     json.stop_description sd.description
  #   end
  #   stop.stop_galleries.each do |sg|
  #     json.stop_gallery_name sg.name
  #     json.stop_galerry_image sg.image.present? ? sg.image.url : "no image"
  #   end
  #
  #   @existing_path_points = []
  #   if i == 0
  #     @existing_path_points << {x_plot: tour.x_plot, y_plot: tour.y_plot} if i == 0
  #     stop.stop_type.classify.constantize.find_by_id(stop.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') }
  #   else
  #     # tour.tour_stops[i-1].stop_id
  #
  #     path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: new_stops_arr[i-1].stop_id).first rescue []
  #     if path.blank?
  #       path = Path.where(map_path_to_id: new_stops_arr[i-1].stop_id, map_path_from_id: stop.stop_id).first rescue []
  #       @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
  #     else
  #       @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
  #     end
  #   end
  #
  #   @existing_path_points.flatten!
  #   json.path_points @existing_path_points
  #
  #
  #   # binding.pry
  #   i+=1
  # end

end