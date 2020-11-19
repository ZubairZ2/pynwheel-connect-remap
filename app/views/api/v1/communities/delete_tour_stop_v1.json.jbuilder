
def check_unit_occupied add_stop
  if add_stop.present? && add_stop.stop_type == "unit"
    u = Unit.find add_stop.stop_id
    return (u.available || u.modal_unit) ? false : true
  else
    return false
  end
end
i = 0
description_limit = 90
styling_start = '<div style="font-family: gotham; color: white !important;"><p style="font-size: 45px; padding-bottom: 10px;">'
styling_end = '</p></div>'
json.tours @tours do |tour|
  if @dwelo_guest_id.present?
    json.dwelo_guest_id @dwelo_guest_id
  else
    json.dwelo_guest_id ""
  end

  json.id tour.id
  require 'securerandom'
  json.tour_key  random_string = SecureRandom.hex
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.x_plot tour.x_plot
  json.y_plot tour.y_plot
  json.tour_setting do
    json.locks_provider @community.locks_provider.present? ? @community.locks_provider : ''
    json.starting_point_locked tour.latch_locks.present? ? (@tour_user.latch_guests.find_by(community_id: @community.id, guest_of_stop_id: tour.latch_locks.first.stop_id, guest_of_stop_type: "Tour", status: "active").present?) : false
    json.current_position_marker_icon tour.marker_icon_size.present? ? (tour.marker_icon_size == "0" ? "19x25" : (tour.marker_icon_size == "1" ? "17x23" : (tour.marker_icon_size == "2" ? "15x21" : (tour.marker_icon_size == "3" ? "13x19" : (tour.marker_icon_size == "4" ? "11x17" : "19x25")  )) ) )  : "19x25"
    json.next_position_marker_icon  tour.marker_icon_size.present? ? (tour.marker_icon_size == "0" ? "35x35" : (tour.marker_icon_size == "1" ? "33x33" : (tour.marker_icon_size == "2" ? "31x31" : (tour.marker_icon_size == "3" ? "29x29" : (tour.marker_icon_size == "4" ? "27x27" : "35x35")  )) ) )  : "35x35"
    json.show_camera_button (@in_visiting_hours == true and @is_tour_virtual == false) ? @community.show_camera_button : false
    json.dotted_line_color @community.tour.dotted_line_color rescue "green"
    json.visual_id_verification tour.visual_id_verification
    json.apply_now_self_tour @community.apply_now_self_tour.present? ? @community.apply_now_self_tour : false
    json.chat_control (@community.chat_control and @community.is_chat_login) ? @community.chat_control : false
    json.show_map @community.show_map
    json.mdu @community.mdu
  end
  plates_name = {}

  current_floor = nil
  current_building = nil
  next_floor = nil
  last_stop_id = nil
   unit_dlt_ids = []
  # if @tour_user.desired_bedroom.present? and (tour.tour_setting.present? ? (tour.tour_setting.show_desired_bedroom.nil? ? true : tour.tour_setting.show_desired_bedroom) : false)
  #   unit_dlt_ids = @community.tour.tour_stops.map{|x| x.id if x.stop_type == "unit" && ((Unit.find_by_id x.stop_id).floorplan.bedrooms.to_i != @tour_user.desired_bedroom.to_i rescue false)}.compact
  # else
  #   unit_dlt_ids = []
  # end
  fs = @community.favorite_stop.present? ? @community.favorite_stop : FavoriteStop.new
  
  favorite_unit_array = (fs.present? ? fs.favorite_unit : []) + (fs.user_favorites_unit[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_unit[@tour_user.email] : [])
  favorite_amenity_array = (fs.user_favorites_amenity[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_amenity[@tour_user.email] : [])
  
  json.is_sitemap @community.is_sitemap
  if @community.is_sitemap
    json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url) rescue nil

  else
    @floorplate = @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    json.image @floorplate.image

  end
  if @community.show_map

    ts = @community.mdu ? tour.tour_stops.where.not(id: @community.deleted_ids).order(:sort) : tour.tour_stops.where.not(id: @community.deleted_ids, stop_type: "unit").order(:sort)
    ts1 = tour.tour_stops.where(id: @community.deleted_ids).map{|x| x.id}

    if @community.is_sitemap
      sp = Path.where(map_path_from_id: ts&.last&.stop_id, map_path_to_id: nil)&.first
    else
      ts.where(stop_type: "elevator").each do |last_elev|
        sp = Path.where(map_path_from_id: last_elev.stop_id, map_path_to_id: nil)&.first unless sp.present? rescue nil
      end
    end

    if sp.blank?
      @community.is_sitemap ? sp = Path.where(map_path_from_id: nil, map_path_to_id: ts&.last&.stop_id)&.first : sp = Path.where(map_path_from_id: nil, map_path_to_id: ts.where(stop_type: "elevator").first.stop_id)&.first rescue nil
      json.path_points sp.present? ? sp.path_points.reorder('id DESC') : []
    else
      json.path_points sp.present? ? sp.path_points.reorder('id ASC') : []
    end
    stops_arr = []  
    add_start = true
    first_bsp = false
    add_bsp_entry = true
    add_bsp_exit = true
    have_stop_in_building = false
    first_floor_elev = nil

    if @community.is_sitemap
      unoccupied = @community.tour.tour_stops.where(stop_type: "unit").map{|x| x.id if (u = Unit.find x.stop_id) and !u.available and !u.modal_unit }.compact
      stops_arr = @community.mdu ? @community.tour.tour_stops.where(display_stop: true).where.not(id: unoccupied).order(:sort) : @community.tour.tour_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop_id = stops_arr.compact[stop_count - 1].id
      last_stop_desc = stops_arr.compact[stop_count - 1]
    else
      temp_max_floor = nil
      min_floor = @floor_list.include?(1) ? 1 : @floor_list[0]
      @building_list << "" if @building_list == []
      @building_list.each do |building|
        @floor_list_loop = (@floor_list_temp.present? && add_start) ? @floor_list_temp : @floor_list
        @floor_list_loop.each do |floor|
          begin
            if add_bsp_entry
              begin
                bsp = BuildingStartingPoint.find_by(community_id: @community.id,building: building)
                bsp_stop = TourStop.find_by(stop_id: bsp.id,stop_type: "building_starting_point")
                bsp_stop.status = "Entry"
                bsp_stop.name = "Building #{building}"
                bsp_stop.building = bsp.building
                bsp_stop.floor = bsp.floor
              rescue => ex
              end
            end
            if add_start
              stops_arr << tour #------- Adding starting point
              add_start = false
              
              # if bsp.present? and bsp.floor != tour.starting_floor
                
              #   first_floor_elev = @all_elevators.map{|x| x[0] if (tour.building.present? ? x[2] == tour.building : x[2] == building) and (tour.starting_floor.present? ? (x[1].include? tour.starting_floor) : (x[1].include? min_floor))}.compact.first
              #   first_floor_elev = TourStop.find_by stop_id: first_floor_elev.id
              #   # first_floor_elev = @community.tour.sort_hash[(tour.building.present? ? tour.building : building) + ","+ tour.starting_floor.to_s].map{|x| TourStop.find x rescue next}.map{|x| x if x.stop_type == "elevator"}.compact.first rescue nil
              #   if first_floor_elev.present?
              #     first_floor_elev.floor = floor
              #     first_floor_elev.building = building
              #     stops_arr << first_floor_elev 
              #   end
              # end

              # begin
              #   if tour.starting_floor.present? and tour.starting_floor != min_floor #and !bsp.present?

              #     first_floor_elev = @all_elevators.map{|x| x[0] if (tour.building.present? ? x[2] == tour.building : x[2] == building) and (tour.starting_floor.present? ? (x[1].include? tour.starting_floor) : (x[1].include? min_floor))}.compact.first
              #     first_floor_elev = TourStop.find_by stop_id: first_floor_elev.id
              #     if first_floor_elev.present?
              #       first_floor_elev.floor = floor
              #       first_floor_elev.building = building
              #       stops_arr << first_floor_elev 
              #     end
              #   end
              # rescue => ex
              # end
            end
            
            if first_bsp && add_bsp_entry
              stops_arr << bsp_stop
              add_bsp_entry  = false
            end
            begin
              if bsp.present? and bsp.floor != min_floor and first_bsp
                first_floor_elev = @all_elevators.map{|x| x[0] if ( x[2] == bsp.building ) and  (x[1].include? bsp.floor) }.compact.first
                first_floor_elev = TourStop.find_by stop_id: first_floor_elev.id
                # first_floor_elev = @community.tour.sort_hash[bsp.building + ","+ bsp.floor.to_s].map{|x| TourStop.find x rescue next}.map{|x| x if x.stop_type == "elevator"}.compact.first rescue nil
                if first_floor_elev.present?
                  first_floor_elev.floor = floor
                  first_floor_elev.building = building
                  stops_arr << first_floor_elev 
                end
              end
            rescue => ex
            end
            

            if @community.tour.sort_hash[building + ","+ floor.to_s].present?

              arr_to_remove = @community.tour.sort_hash[building + ","+ floor.to_s].grep(/\d+/, &:to_i) - @community.deleted_ids 
              
              if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.count == 1 && (min_floor != floor && @building_list[0] != building) && (arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.include? "elevator") && (@community.tour.starting_floor.present? ? @community.tour.starting_floor != floor.to_i : true )
                begin
                  # unless ((TourStop.find arr_to_remove).map{|x| (Elevator.find x.stop_id).floors.max - 1 if x.stop_type == "elevator"}).include? floor
                  next
                  # end
                rescue
                end
              end
              temp_max_floor = floor
              @community.tour.sort_hash[building + ","+ floor.to_s].each do |s_id|
                # amenity_hit = true
                # ts_ck = (TourStop.find_by_id(s_id)) if (s_id.present? )
                # if ts_ck.present?  && ts_ck.stop_type == "amenity"
                #   amenity_hit = ([floor, nil].includes? (ts_ck.stop_type.classify.constantize.find (ts_ck.stop_id)).floor ) rescue true
                # end
                add_stop = TourStop.find_by_id(s_id)

                if add_stop.present?
                  add_stop.floor = floor
                  add_stop.building = building
                  next if (check_unit_occupied add_stop)
                  next if add_start and ((add_stop.stop_type == "unit") or (add_stop.stop_type == "amenity"))
                  
                  add_mdu = @community.mdu ? true : !(add_stop.stop_type == "unit")
                  if (add_stop.display_stop && add_mdu) and !(@community.deleted_ids.include? add_stop.id)
                    stops_arr << add_stop 
                    if add_stop.stop_type == "amenity" || add_stop.stop_type == "unit"
                      last_stop_id = add_stop.id
                      have_stop_in_building = true
                      
                      if first_floor_elev.present? && tour.starting_floor.to_i == add_stop.floor
                        stops_arr = stops_arr - [first_floor_elev]
                        first_floor_elev = nil
                      end
                    end
                  end
                end
                # stops_arr << (TourStop.find_by_id(s_id)) if (s_id.present? )
              end
              
            end
          rescue => ex
            puts ex
          end
        end
        begin
          
          if stops_arr.map{|x| x.stop_type if (x.is_a? TourStop and x.building == building and x.stop_type != "elevator" and x.stop_type != "building_starting_point")}.uniq.compact == []
            stops_arr = stops_arr[0..stops_arr.size-2]
          end
          
          add_bsp_entry = true
          unless have_stop_in_building
              bsp = BuildingStartingPoint.find_by(community_id: @community.id,building: building)
              bsp_stop = TourStop.find_by(stop_id: bsp.id,stop_type: "building_starting_point")
              stops_arr = stops_arr - [bsp_stop]
              
          else
            
          end
        rescue => ex
        end
        first_bsp = true if (first_bsp or have_stop_in_building)
        have_stop_in_building = false
        
          # begin
            
          #   bsp = BuildingStartingPoint.find_by(community_id: @community.id,building: building)
          #   bsp_stop = TourStop.find_by(stop_id: bsp.id,stop_type: "building_starting_point")
          #   bsp_stop.status = "Exit"
          #   bsp_stop.name = "Building Exit"
          #   stops_arr << bsp_stop
          #   add_bsp_entry = true
          # rescue => ex
          # end
      end
      stop_count = stops_arr.compact.count

      second_last = stops_arr.compact[stop_count - 3]
      if (stops_arr.compact[stop_count - 1].is_a? TourStop) and stops_arr.compact[stop_count - 1].stop_type == "unit" || stops_arr.compact[stop_count - 1].stop_type == "amenity"
        second_last_count_num = stops_arr.compact.count - 2
      else
        second_last_count_num = stops_arr.compact.count - 3
      end
      last_stop_desc = stops_arr.compact[stop_count - 2]
      last_last_count_num = stops_arr.compact.count - 1
      blocked = []
      # begin
      # while (stops_arr.compact[stops_arr.compact.size - 1]).stop_type == "elevator"
      #   blocked << stops_arr.compact[stops_arr.compact.size - 1].stop_id
      #   stops_arr = stops_arr - [stops_arr[stops_arr.size - 1]]
      # end
      # rescue
      # end
      
      last_stop = (stops_arr.compact[stops_arr.compact.size - 1].is_a? Tour) ? stops_arr.compact[stops_arr.compact.size - 2] : stops_arr.compact[stops_arr.compact.size - 1] 

      sto = last_stop.stop_type.classify.constantize.find_by_id(last_stop.stop_id)
      max_floor = sto.floors.max rescue (max_floor = temp_max_floor)
      @plates = []
      @ele_ = []
      Floorplate.where(community_id: @community.id).each{|x| @plates << x}
      @plates.each do |pl|
        pl.floors.select{ |fl| plates_name[fl.to_s] = (pl.floor_name.present? ? pl.floor_name : fl.to_s ) } rescue nil # assigning name 
        floor_pl = Floorplate.find pl
        Elevator.where(floorplate_id: pl).map{|x| @ele_ << x}
      end
      ele_hit = false
      while !(min_floor >= max_floor) do
        begin
          
          if (stops_arr.last.stop_type == "elevator" rescue false) and !ele_hit
            ele = Elevator.find stops_arr.last.stop_id
            ele_hit = true
          else
            ele = @ele_.map{|x| x if x.floors.include?(max_floor) && x.floors.min != max_floor}.compact.first
            ele_hit = true
          end
          max_floor = ele.floors.min
          if stops_arr[stops_arr.size - 1].stop_id == ele.id
            max_floor = max_floor - 1
            next
          end

          stops_arr << TourStop.find_by(stop_id: ele.id) unless blocked.include?(ele.id)

        rescue
          break
        end
      end
    end



    stops = @community.mdu ? tour.tour_stops : tour.tour_stops.where.not(stop_type: "unit")
    # all_stop_ids = stops_arr.compact.pluck(:id)
    
    # stops_except_deleted_ids = all_stop_ids - @community.deleted_ids
    stops_except_deleted = []
    stops_except_deleted << tour if @community.is_sitemap
    stops_arr.compact.each do |stop|
      stops_except_deleted << stop unless (@community.deleted_ids.include?(stop.id) || unit_dlt_ids.include?(stop.id) )
    end
    stops_except_deleted << tour if
    # if (tour.starting_floor.nil? or tour.starting_floor == min_floor) and !@community.is_sitemap
    #   stops_except_deleted << tour #------- Adding starting point
    # end

    # stops_except_deleted_ids.each do |id|
    #   stops_except_deleted << TourStop.find(id)
    # end

    new_stops_arr = []
    last_element  = nil
    stops_except_deleted.each do |x|
      if last_element != x
        new_stops_arr << x
      end
      last_element = x
    end
  else
    stops_arr = []

    ########------------------------ Sorting tour Stop in an array-----------------------
    if @community.is_sitemap

      unoccupied = @community.tour.tour_stops.where(stop_type: "unit").map{|x| x.id if (u = Unit.find x.stop_id) and !u.available and !u.modal_unit}.compact
      stops_arr = @community.mdu ? @community.tour.tour_stops.where(display_stop: true).where.not(id: unoccupied).order(:sort) : @community.tour.tour_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
      stops_arr = stops_arr.map{|x| x if !(@community.deleted_ids.include? x.id)}.compact
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop_id = stops_arr.compact[stop_count - 1].id
      last_stop_desc = stops_arr.compact[stop_count - 1]
    else
      temp_max_floor = nil
      min_floor = @floor_list[0]
      @building_list << "" if @building_list == []
      @building_list.each do |building|
        @floor_list_loop = (@floor_list_temp.present? && add_start) ? @floor_list_temp : @floor_list
        @floor_list_loop.each do |floor|

          begin
            # if @tour_user.desired_bedroom.present? and (tour.tour_setting.present? ? (tour.tour_setting.show_desired_bedroom.nil? ? true : tour.tour_setting.show_desired_bedroom) : false)
            #   unit_dlt_ids = @community.tour.tour_stops.map{|x| x.id if x.stop_type == "unit" && ((Unit.find_by_id x.stop_id).floorplan.bedrooms.to_i != @tour_user.desired_bedroom.to_i rescue false)}.compact
            # else
            #   unit_dlt_ids = []
            # end
            unit_dlt_ids = []
            if @community.tour.sort_hash[building + ","+ floor.to_s].present?
              arr_to_remove = @community.tour.sort_hash[building + ","+ floor.to_s].grep(/\d+/, &:to_i) - ( @community.deleted_ids + unit_dlt_ids)
              if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.count == 1 && (min_floor != floor) && (arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.include? "elevator")
                begin
                  # unless ((TourStop.find arr_to_remove).map{|x| (Elevator.find x.stop_id).floors.max - 1 if x.stop_type == "elevator"}).include? floor
                  next
                  # end
                rescue
                end
              end
              temp_max_floor = floor
              @community.tour.sort_hash[building + ","+ floor.to_s].each do |s_id|
                # amenity_hit = true
                # ts_ck = (TourStop.find_by_id(s_id)) if (s_id.present? )
                # if ts_ck.present?  && ts_ck.stop_type == "amenity"
                #   amenity_hit = ([floor, nil].includes? (ts_ck.stop_type.classify.constantize.find (ts_ck.stop_id)).floor ) rescue true
                # end
                add_stop = TourStop.find_by_id(s_id)
                if add_stop.present?


                  next if (check_unit_occupied add_stop)
                  add_mdu = @community.mdu ? true : !(add_stop.stop_type == "unit")
                  if (add_stop.display_stop && add_mdu) and !(@community.deleted_ids.include? add_stop.id)
                    stops_arr << add_stop 
                    last_stop_id = add_stop.id if add_stop.stop_type == "amenity" || add_stop.stop_type == "unit"
                  end
                end
                # stops_arr << (TourStop.find_by_id(s_id)) if (s_id.present? )
              end
            end
          rescue
          end
        end
      end
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop_desc = stops_arr.compact[stop_count - 1]
      blocked = []
      last_stop = stops_arr.compact[stops_arr.compact.size - 1]
    end
    #########-------------------- End tour stop sort-----------------------
    new_stops_arr = stops_arr.compact
    json.path_points []
    # new_stops_arr = @community.mdu ? tour.tour_stops : tour.tour_stops.where.not(stop_type: "unit")
    # stop_count = new_stops_arr.count
    # second_last = new_stops_arr[stop_count - 2]
    # last_stop_desc = new_stops_arr[stop_count - 1]
  end
  

  hit = true
  once_flag = true
  counter = 0
  if new_stops_arr[0].is_a? Tour
    json.navigation_title "Starting point"
  else
    json.navigation_title "First Stop: " + new_stops_arr[0].name if new_stops_arr[0].present?
  end
  skip_1 = false 
  skip_1_path = false
  # ///////////////////////////////////////////////////////////////////// Stop data //////////////////////////////////////////////////////
  json.tour_stop new_stops_arr.compact do |stop|
    
    begin
      if skip_1
        i += 1
        counter += 1
        skip_1 = false
        next
      end
      
      if (stop.is_a? TourStop) and (new_stops_arr[counter + 2].is_a? TourStop) and (stop.building != new_stops_arr[counter + 2].building) and (new_stops_arr[counter + 1].stop_type == "elevator") and (stop.floor == new_stops_arr[counter + 2].floor) 
        skip_1 = true
      end
      skip_bool = (new_stops_arr[counter + 2].is_a? Tour) ? (new_stops_arr[counter + 1].stop_type == "elevator" and new_stops_arr[counter + 1].building != new_stops_arr[counter + 2].building and stop.floor == new_stops_arr[counter+2].starting_floor) : (new_stops_arr[counter + 1].stop_type == "elevator" and new_stops_arr[counter + 1].building != new_stops_arr[counter + 2].building and stop.floor == new_stops_arr[counter+2].floor)
      if skip_bool
        skip_1 = true
      end 
    rescue => ex
    end
    # if counter == 0
    #   json.navigation_title "First Stop " + new_stops_arr[counter].name if new_stops_arr[counter].present?

    if stop.is_a? TourStop
      if @community.show_map
        begin
          if (stop.latitude + stop.longitude) < 1
            counter = counter + 1
            next
          end 
        rescue => err
          next unless stop.stop_type == "elevator"
        end
      else
        if stop.stop_type == "elevator"
          counter = counter + 1
          next
        end 
      end
    end


    # next if !@community.mdu && stop.stop_type == "unit"
    navigation_title = ""

    if new_stops_arr[counter + 1].is_a? Tour
      ((new_stops_arr.compact.size - 2) == counter) ? navigation_title = "Next Stop: Starting point" : navigation_title = "Next Stop: Starting point"
    elsif skip_1 and new_stops_arr[counter + 2].is_a? Tour
      ((new_stops_arr.compact.size - 2) == counter) ? navigation_title = "Next Stop: Starting point" : navigation_title = "Next Stop: Starting point"
    elsif  new_stops_arr.compact[counter + 1].present? and new_stops_arr.compact[counter + 1].id == last_stop_id
      navigation_title = @community.show_map ? ("Last Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      hit = false
    elsif last_stop_desc.present? && last_stop_desc.id == stop.id
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Last Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    elsif counter == 0
      navigation_title = @community.show_map ? ("First Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("First Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    elsif skip_1 and new_stops_arr[counter + 2].present?
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 2].name if new_stops_arr[counter + 2].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    elsif new_stops_arr[counter + 1].present?
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    elsif last_last_count_num == counter
      navigation_title = "Your tour is completed! Now let's go back to where you started."
    end

    begin
      if (navigation_title.include? "elevator") || (navigation_title.include? "Elevator") && !counter == 0
        navigation_title = "Next Stop: Elevator"
      end
    rescue => e
      navigation_title = ""
    end
    
    if stop.is_a? Tour 
      json.guest_pin  ""
      json.latch_link ''
      json.navigation_title navigation_title
      json.id stop.id
      json.x_plot stop.x_plot
      json.y_plot stop.y_plot
      json.is_favorite false
      json.type "starting_point"
      json.name "Starting Point"
      json.directional_text counter != 0 ? "Your tour is completed! Now let's go back to where you started." : ""
      # if !@community.is_sitemap && stop.starting_floor.present? && stop.starting_floor != min_floor && once_flag
      #   @floorplate = @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
      #   json.floorplate_image @floorplate.image.url
      #   once_flag = false
      # else
      json.floorplate_image @community.is_sitemap ? @community.sitemap.image.url : (stop.starting_floor.present? ? @community.floorplates.select{|x| x if x.floors.include?(stop.starting_floor.to_i)}.last.image.url : @community.floorplates.select{|x| x if x.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.min)}.last.image.url) 
      # end
      @existing_path_points = []
      begin
        if counter == 0


          # path = Path.where(map_path_to_id: nil, map_path_from_id: new_stops_arr[i+1].stop_id).first
          # if path.blank?
          #   path = Path.where(map_path_to_id:  new_stops_arr[i+1].stop_id, map_path_from_id: nil).first
          #   @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
          # else
          #   @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
          # end
          @existing_path_points = []
        else
          path = Path.where(map_path_to_id: nil, map_path_from_id: new_stops_arr[i-1].stop_id).first
          if path.blank?
            path = Path.where(map_path_to_id:  new_stops_arr[i-1].stop_id, map_path_from_id: nil).first
            @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
          else
            @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
          end
        end
      rescue => ex
        @existing_path_points = []
      end
      json.path_points @existing_path_points[0].present? ? @existing_path_points[0] : @existing_path_points
      json.stop_description ((new_stops_arr.size - 1) == counter ? "Your Tour Has Ended" : "Starting point")
      counter = counter + 1
      i += 1


      begin
        if counter == 1 and @community.locks_provider == "Latch" and @community.latch.present? and stop.latch_locks.present?
          lch = LatchLock.find_by(latch_id: @community.latch.id, stop_id: stop.latch_locks.first.stop_id)
          if lch.present?
  
            latch_guest = @tour_user.latch_guests.find_by(community_id: @community.id, guest_of_stop_id: stop.latch_locks.first.stop_id, guest_of_stop_type: "Tour", status: "active") if @tour_user.present?
            if latch_guest.present?
              json.guest_pin ''
              json.latch_link latch_guest.latch_link
            else
              json.guest_pin ''
              json.latch_link ''
            end
          end
        else
          json.guest_pin ''
          json.latch_link ''
        end
      rescue => exception
        json.guest_pin ''
        json.latch_link ''
      end

      next
    end
    begin
      if @in_visiting_hours and !@is_tour_virtual
        if @community.locks_provider == "EdgeState"
          rml = RemoteLock.find_by(edge_state_id: @community.edge_state.id , stop_id: stop.stop_id) if @community.edge_state.present?
          if rml.present?
            if @tour_user.present? and @tour_user.as_guests.find_by(community_id: @community.id).present?
              igloo_guest = IglooGuest.find_by(stop_id: stop.stop_id, tour_user_id: @tour_user.id, status: "active")
              if igloo_guest.nil? 
                pin = @tour_user.as_guests.find_by(community_id: @community.id).edgestate_pin if @tour_user.as_guests.find_by(community_id: @community.id).present?
                json.guest_pin "Use code " + pin + "# to enter." if pin.present? and rml.remote_lock_type != "igloo_lock"
                json.latch_link ''
              else
                json.guest_pin "Use code " + igloo_guest.guest_code + " to enter." if igloo_guest.guest_code.present?
                json.latch_link ''
              end
            else
              json.guest_pin ''
              json.latch_link ''
            end
          else
            _stop_ = Unit.find_by_id stop.stop_id
            if _stop_.present? and _stop_.access_code.present?
              json.guest_pin "Use code " + _stop_.access_code + " to enter."
              json.latch_link ''
            else
              json.guest_pin ''
              json.latch_link ''
            end
          end
        elsif @community.locks_provider == "Latch"
          lch = LatchLock.find_by(latch_id: @community.latch.id, stop_id: stop.stop_id) if @community.latch.present?
          if lch.present?

            latch_guest = @tour_user.latch_guests.find_by(community_id: @community.id, guest_of_stop_id: stop.stop_id, status: "active") if @tour_user.present?
            if latch_guest.present?
              json.guest_pin ''
              json.latch_link latch_guest.latch_link
            else
              json.guest_pin ''
              json.latch_link ''
            end
          else
            _stop_ = Unit.find_by_id stop.stop_id
            if _stop_.present? and _stop_.access_code.present?
              json.guest_pin "Use code " + _stop_.access_code + " to enter."
              json.latch_link ''
            else
              json.guest_pin ''
              json.latch_link ''
            end
          end
        elsif @community.locks_provider.nil?
          _stop_ = Unit.find_by_id stop.stop_id
          unit_dwelo_lock = _stop_.remote_locks.where.not(dwelo_id: nil).first rescue nil
          if _stop_.present? and _stop_.access_code.present? and unit_dwelo_lock.nil?
            json.guest_pin "Use code " + _stop_.access_code + " to enter."
            json.latch_link ''
          else
            json.guest_pin ''
            json.latch_link ''
          end
        end
      else
        json.guest_pin ''
        json.latch_link ''
      end
    rescue => pin
      json.guest_pin ''
      json.latch_link ''
    end
    json.navigation_title navigation_title
    json.id stop.id rescue next
    json.x_plot stop.latitude rescue next
    json.y_plot stop.longitude
    json.unit_id stop.stop_id
    json.is_favorite favorite_unit_array.include?(stop.stop_id.to_s) ? true : false
    if params[:testing].present?
      if stop.stop_type == 'amenity' then json.type 'elevator' else json.type stop.stop_type end
    else
      json.type stop.stop_type
    end
    if stop.stop_type == "unit"
      unit = Unit.find_by_id stop.stop_id
      if unit.present?

      json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image" rescue "no image") ): "no image"
      images = []
      if (unit.image.present? || unit.floorplan.image.present? rescue false)
        img = {url: unit.image.present? ? unit.image.url : unit.floorplan.image.url }
        images << img
      end
      if (unit.secondary_image.present? || unit.floorplan.secondary_image.present? rescue false)
        img = {url: unit.secondary_image.present? ? unit.secondary_image.url : unit.floorplan.secondary_image.url }
        images << img
      end
      current_floor = unit.floor
      unit_dwelo_lock = unit.remote_locks.where.not(dwelo_id: nil).first rescue nil
      if @in_visiting_hours and !@is_tour_virtual and @community.locks_provider == "Dwelo" and unit_dwelo_lock.present?
        json.unit_dwelo_lock_id unit_dwelo_lock.device_id
      else
        json.unit_dwelo_lock_id ""
      end
      json.image_list images
      json.name (unit.building.present? ? (unit.building + "-") : "") + unit.marketing_name
      json.floorplate_image (unit.floorplate.image.present? ? unit.floorplate.image.url : nil) if unit.floorplate.present?
      json.floorplate_image (unit.floorplate.image.present? ? unit.floorplate.image.url : nil) if unit.floorplate.present?

      unit_directional_text = ActionView::Base.full_sanitizer.sanitize(unit.stop_description.present? ? unit.stop_description : "")

      if unit_directional_text.size < description_limit
        show_directional_text = false
      else
        show_directional_text = true
      end

      json.directional_text show_directional_text ? unit_directional_text[0..description_limit - 1] : unit_directional_text
      json.show_long_directional_text show_directional_text
      json.long_directional_text styling_start + unit.stop_description.gsub('red','') + styling_end rescue ""      
      json.video_link_button_label unit.virtual_tour_button_label
      json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ""
      lease_pricing = []
      if unit.lease_pricing.present? && !unit.modal_unit
        str_split = unit.lease_pricing.split(';')
        str_split.each do |ss|
          str = ss.split(':')

          pricing_str = str[0]+" Month - $"+str[1]
          # h = {"pricing_option" => pricing_str}
          lease_pricing << pricing_str

        end
        lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
        lease_pricing2 = []
        lease_pricing.each do |lp|
          lease_pricing2 << {"pricing_option" => lp}
        end
        lease_pricing = lease_pricing2
      else
        h = {"pricing_option" => "$"+ unit.effective_rent.to_s}
        lease_pricing << h
      end
      if unit.modal_unit
        lease_pricing = []
        @units = Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', unit.floorplan_id,unit.community_id,true) if unit.present?
        @units.each do |floorplan_unit|
          unless floorplan_unit.id == unit.id
            pricing_str = {"pricing_option" => floorplan_unit.marketing_name + " $" + floorplan_unit.effective_rent.to_s} rescue next
            lease_pricing << pricing_str
          end
        end
        lease_pricing = lease_pricing.sort_by!(&:zip)
      end
      unit_stop_description = ActionView::Base.full_sanitizer.sanitize(unit.stop_description.present? ? unit.stop_description : "")

      if unit_stop_description.size < description_limit
        show_long_description = false
      else
        show_long_description = true
      end

      stop_dat = {"floorplan" => (Floorplan.find_by(id: unit.floorplan.id).name rescue ""),"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"lease_pricing" => lease_pricing,"availability" => unit.availability,"stop_description" => show_long_description ? unit_stop_description[0..description_limit - 1] : unit_stop_description,"show_long_description" => show_long_description,"long_stop_description" => (styling_start + unit.stop_description.gsub('red','') + styling_end  rescue ""), "availability_url"=> unit.availability_url.present? ? unit.availability_url :  (Floorplan.find_by(provider_floorplan_id: unit.floorplan_id).availability_url rescue "")}
      json.stop_data stop_dat
      @unit_amenities = unit.amenities #Amenity.where(community_id: @community.id, amenityable_type: "Unit", amenityable_id: stop.stop_id)
      unit_amenities_hit = true

      #////////////////////////////////////////// Unit Amenities NOTT Plotted ////////////////////////////////////////////
      
      json.unit_unploted_amenities @unit_amenities.order(:sort) do |unit_amenity|
        
        if unit_amenity.x_plot.nil? || (unit_amenity.x_plot + unit_amenity.y_plot == 0)
          unit_amenities_hit = false
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.name unit_amenity.name
          json.image unit_amenity.image.present? ? (unit_amenity.crop_x.present? ? unit_amenity.image.url + "?temp/"+unit_amenity.crop_x.to_s :  unit_amenity.image.url ): "no image"
          json.stop_description unit_amenity.description
          json.directional_text unit_amenity.directional_text
          json.video_link_button_label unit.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ?  unit.virtual_tour_url : ""
          if unit_amenity.amenity_galleries.count == 0
            # temp_data = {"name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description}
            json.gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description, "directional_text" => unit_amenity.directional_text]
          else
            amenityGalleryArr = []
            # unit_amenity.description = nil
            amenityGalleryArr << unit_amenity
            unit_amenity.amenity_galleries.order(:sort).each do |amen|
              amenityGalleryArr << amen
            end
            json.gallery amenityGalleryArr do |ag|
              json.name ag.name
              json.image ag.image.url
              json.description ag.description
              json.directional_text ag.directional_text
            end
          end

        end
      end
      #///////////////////////////////////////// Unit amenities Plotted ///////////////////////////////////
      json.unit_amenities @unit_amenities.order(:sort) do |unit_amenity|
        if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
          unit_amenities_hit = false
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.name unit_amenity.name
          json.image unit_amenity.image.present? ? (unit_amenity.crop_x.present? ? unit_amenity.image.url + "?temp/"+unit_amenity.crop_x.to_s :  unit_amenity.image.url ): "no image"
          unit_amenity_stop_description = ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")

          if unit_amenity_stop_description.size < description_limit
            json.show_long_description false
          json.stop_description unit_amenity_stop_description
          else
            json.show_long_description true

          json.stop_description unit_amenity_stop_description[0..description_limit - 1]
          end

          json.long_stop_description styling_start + unit_amenity.description.gsub('red','') + styling_end  rescue ""

          unit_amenity_directional_text = ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")
          if unit_amenity_directional_text.size < description_limit
            json.show_long_directional_text false
          json.directional_text unit_amenity_directional_text
          else
            json.show_long_directional_text true
          json.directional_text unit_amenity_directional_text[0..description_limit - 1]
          end

          json.long_directional_text styling_start + unit_amenity.directional_text.gsub('red','') + styling_end  rescue ""
          json.video_link_button_label unit.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ?  unit.virtual_tour_url : ""
          if unit_amenity.amenity_galleries.count == 0
            stop_description = ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")

            if stop_description.size < description_limit
              show_long_description = false
            else
              show_long_description = true
            end
            directional_text = ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")

            if directional_text.size < description_limit
              show_directional_text = false
            else
              show_directional_text = true
            end
            # temp_data = {"name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description}

            json.gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => show_long_description ? stop_description[0..description_limit - 1] : stop_description,"show_long_description" => show_long_description ,"long_description" => (styling_start + unit.description + styling_end  rescue ""), "directional_text" => show_directional_text ? directional_text[0..description_limit - 1] : directional_text,"show_long_directional_text" => show_directional_text,"long_directional_text" => (styling_start + unit_amenity.directional_text.gsub('red','') + styling_end  rescue "")]
          else

            amenityGalleryArr = []
            # unit_amenity.description = nil
            amenityGalleryArr << unit_amenity
            unit_amenity.amenity_galleries.order(:sort).each do |amen|
              amenityGalleryArr << amen
            end
            json.gallery amenityGalleryArr do |ag|
              json.name ag.name
              json.image ag.image.url
              stop_description = ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")

              if stop_description.size < description_limit
                json.show_long_description false
                json.description stop_description
              else
                json.show_long_description true

                json.description stop_description[0..description_limit - 1]
              end
              json.long_description styling_start + ag.description + styling_end  rescue ""

              stop_description = ActionView::Base.full_sanitizer.sanitize(ag.directional_text.present? ? ag.directional_text : "")

              if stop_description.size < description_limit
                json.show_long_directional_text false
                json.directional_text stop_description
              else
                json.show_long_directional_text true

                json.directional_text stop_description[0..description_limit - 1]
              end              
              json.long_directional_text styling_start + ag.directional_text.gsub('red','') + styling_end  rescue ""
            end
          end

        end
      end
      # if unit_amenities_hit
      #   unit_amenities_array = [
      #       "x_plot" => 0,
      #       "y_plot" => 0,
      #       "name" => "No Image",
      #       "image" => image_url("no_image.png"),
      #       "stop_description" => nil,
      #       "directional_text" => nil,
      #       "gallery" => {"name" => "No Image",
      #                     "image" => image_url("no_image.png"),
      #                     "description" => nil,
      #                     "directional_text" => nil }
      #   ]
      #
      #   json.unit_amenities unit_amenities_array
      # end
      end
    elsif stop.stop_type == "building_starting_point"
      bsp = BuildingStartingPoint.find stop.stop_id
      json.type "starting_point"
      json.name bsp.name
      json.directional_text bsp.directional_text
      
      json.floorplate_image @community.floorplates.map{|x| x if (x.floors.include? bsp.floor)}.compact.first.image.url rescue ""

    elsif stop.stop_type == "elevator"
      
      elevator = Elevator.find_by_id stop.stop_id
      json.image elevator.image.present? ? elevator.image.url : asset_path("elev2.png")
      json.name "Elevator"#elevator.description
      # json.name elevator.name
      # json.directional_text (counter != 0 && (new_stops_arr.compact[counter + 1].is_a? Tour)) ? "Your tour is completed! Now let's go back to where you started." : elevator.directional_text
      
      json.directional_text elevator.directional_text
      json.video_link_button_label ""
      json.video_link ""
      
      if new_stops_arr.compact[counter + 1].present?
        next_stop = new_stops_arr.compact[counter + 1]
        next_stop = next_stop.stop_type.classify.constantize.find next_stop.stop_id rescue nil
        if next_stop.is_a? Elevator
          next_floor = current_floor
          elevator_stop_description = ""

          if hit
            current_stop = stop.stop_type.classify.constantize.find stop.stop_id rescue nil
            elevator_stop_description = current_stop.floors.present? ? "Go to floor " + (plates_name[current_stop.floors.max.to_s].present? ? plates_name[current_stop.floors.max.to_s] : current_stop.floors.max.to_s rescue current_stop.floors.max.to_s) : "" rescue ""
          else
            current_stop = stop.stop_type.classify.constantize.find stop.stop_id rescue nil
            elevator_stop_description =  current_stop.floors.present? ? "Go to floor " + (plates_name[current_stop.floors.min.to_s].present? ? plates_name[current_stop.floors.min.to_s] : current_stop.floors.min.to_s rescue current_stop.floors.min.to_s) : "" rescue ""
          end
          if current_stop.present? and next_stop.present? and current_stop.building.present? and next_stop.building.present? and current_stop.building != next_stop.building
            elevator_stop_description =  "Go to floor " + (plates_name[next_stop.floors.min.to_s].present? ? plates_name[next_stop.floors.min.to_s] : next_stop.floors.min.to_s rescue next_stop.floors.min.to_s) rescue elevator_stop_description           
          end
        else
          elevator_stop_description =  next_stop.floor.present? ? "Go to floor " + (plates_name[next_stop.floor.to_s].present? ? plates_name[next_stop.floor.to_s] : next_stop.floor.to_s rescue next_stop.floor.to_s) : "" rescue ""
          next_floor  = next_stop.floor.to_i rescue current_floor
        end
        if new_stops_arr.compact[counter + 1].is_a? Tour
          fl_text = (new_stops_arr.compact[counter + 1].starting_floor.present? ? new_stops_arr.compact[counter + 1].starting_floor : min_floor).to_s
          elevator_stop_description = "Go to floor " + (plates_name[fl_text].present? ? plates_name[fl_text] : fl_text rescue fl_text)
          next_floor  = (new_stops_arr.compact[counter + 1].starting_floor.present? ? new_stops_arr.compact[counter + 1].starting_floor : current_floor).to_i
        end

      else
        
        elevator_stop_description = "Go to floor " + (plates_name[min_floor.to_s].present? ? plates_name[min_floor.to_s] : min_floor.to_s rescue min_floor.to_s)
      end
      if current_floor.present?
        floor_image = @community.floorplates.map{|x| x if x.floors.include?(current_floor)}.compact.last.image.url rescue nil
        floor_image = (elevator.floorplate.image.present? ? elevator.floorplate.image.url : nil) if elevator.floorplate.present? if floor_image.nil?
        json.floorplate_image floor_image
        if new_stops_arr[counter - 1].is_a? Tour 
          json.floorplate_image @community.floorplates.map{|x| x if x.floors.include?(@community.tour.starting_floor.present? ? @community.tour.starting_floor : min_floor)}.compact.last.image.url rescue nil
        end
      else
        json.floorplate_image (elevator.floorplate.image.present? ? elevator.floorplate.image.url : nil) if elevator.floorplate.present?
        if new_stops_arr[counter - 1].is_a? Tour 
          json.floorplate_image @community.floorplates.map{|x| x if x.floors.include?(@community.tour.starting_floor.present? ? @community.tour.starting_floor : min_floor)}.compact.last.image.url rescue nil
        end
      end

      # if last_last_count_num.present? and next_floor.present? and current_floor.present? and counter <= last_last_count_num and current_floor > next_floor
      #   floor_image = @community.floorplates.map{|x| x if x.floors.include?(current_floor)}.compact.last rescue nil
      #   floor_image = (elevator.floorplate.image.present? ? elevator.floorplate.image.url : nil) if elevator.floorplate.present? if floor_image.nil?
      #   json.floorplate_image floor_image
      # else
      #   json.floorplate_image (elevator.floorplate.image.present? ? elevator.floorplate.image.url : nil) if elevator.floorplate.present?
      # end
      json.stop_description elevator_stop_description
      if elevator.elevator_galleries.count == 0
        json.gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator_stop_description, "directional_text" => elevator.directional_text]
      else
        # json.elevator_gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator.description]

        elevatorGalleryArr = []
        # elevator.description = nil
        elevatorGalleryArr << elevator
        elevator.elevator_galleries.each do |amen|
          elevatorGalleryArr << amen
        end
        json.gallery elevatorGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url
          json.description ag.description
          json.directional_text ag.directional_text
        end
      end
      current_floor = nil
    elsif stop.stop_type == "amenity"
      amenity = Amenity.find stop.stop_id
      json.image amenity.image.present? ? amenity.image.url : "no image"
      stop_description = ActionView::Base.full_sanitizer.sanitize(amenity.description.present? ? amenity.description : "")

      if stop_description.size < description_limit
        json.show_long_description false
        json.stop_description stop_description
      else
        json.show_long_description true

        json.stop_description stop_description[0..description_limit - 1]
      end
      json.long_stop_description styling_start + amenity.description.gsub('red','') + styling_end  rescue ""
      current_floor = amenity.floor
      json.name amenity.name
      directional_text = ActionView::Base.full_sanitizer.sanitize(amenity.directional_text.present? ? amenity.directional_text : "")

      if directional_text.size < description_limit
        json.show_long_directional_text false
      json.directional_text directional_text
      else
        json.show_long_directional_text true

      json.directional_text directional_text[0..description_limit - 1]
      end
      json.long_directional_text styling_start + amenity.directional_text.gsub('red','') + styling_end  rescue ""

      json.video_link_button_label amenity.video_link_button_label
      json.video_link amenity.video_link.present? ? amenity.video_link : ""
      if @in_visiting_hours and !@is_tour_virtual
        if @community.locks_provider == "EdgeState"
          rml = RemoteLock.find_by(edge_state_id: @community.edge_state.id , stop_id: stop.stop_id) if @community.edge_state.present?
          if rml.present?
            if @tour_user.present? and @tour_user.as_guests.find_by(community_id: @community.id).present?
              igloo_guest = IglooGuest.find_by(stop_id: stop.stop_id, tour_user_id: @tour_user.id, status: "active")
              if igloo_guest.nil? 
                pin = @tour_user.as_guests.find_by(community_id: @community.id).edgestate_pin if @tour_user.as_guests.find_by(community_id: @community.id).present?
                json.guest_pin "Use code " + pin + "# to enter." if pin.present? and rml.remote_lock_type != "igloo_lock"
                json.latch_link ''
              else
                json.guest_pin "Use code " + igloo_guest.guest_code + " to enter." if igloo_guest.guest_code.present?
                json.latch_link ''
              end
            else
              json.guest_pin ''
              json.latch_link ''
            end
          else
            _stop_ = Amenity.find_by_id stop.stop_id
            if _stop_.present? and _stop_.access_code.present?
              json.guest_pin "Use code " + _stop_.access_code + " to enter."
              json.latch_link ''
            else
              json.guest_pin ''
              json.latch_link ''
            end
          end
        elsif @community.locks_provider.nil?
          _stop_ = Amenity.find_by_id stop.stop_id
          if _stop_.present? and _stop_.access_code.present?
            json.guest_pin "Use code " + _stop_.access_code + " to enter."
            json.latch_link ''
          else
            json.guest_pin ''
            json.latch_link ''
          end
        end
      else
        json.guest_pin ''
        json.latch_link ''
      end
      json.floorplate_image (amenity.amenityable.image.present? ? amenity.amenityable.image.url : nil) if amenity.amenityable.present?
      json.is_favorite favorite_amenity_array.include?(stop.stop_id.to_s) ? true : false
      if amenity.amenity_galleries.count == 0
         stop_description = ActionView::Base.full_sanitizer.sanitize(amenity.description.present? ? amenity.description : "")

        if stop_description.size < description_limit
          show_long_description = false
        else
          show_long_description = true
        end
        directional_text = ActionView::Base.full_sanitizer.sanitize(amenity.directional_text.present? ? amenity.directional_text : "")

        if directional_text.size < description_limit
          show_directional_text = false
        else
          show_directional_text = true
        end

        json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image","show_long_description" => show_long_description, "description" => show_long_description ? stop_description[0..description_limit - 1] : stop_description,"stop_description" => (styling_start + amenity.description.gsub('red','') + styling_end  rescue ""),"show_long_directional_text" => show_directional_text, "directional_text" => show_directional_text ? directional_text[0..description_limit - 1] : directional_text,"long_directional_text" => (styling_start + amenity.directional_text.gsub('red','') + styling_end  rescue "")]
      else
        # json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description]

        amenityGalleryArr = []
        # amenity.description = nil
        amenityGalleryArr << amenity
        amenity.amenity_galleries.order(:sort).each do |amen|
          amenityGalleryArr << amen
        end
        json.gallery amenityGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url
          stop_description = ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")

          if stop_description.size < description_limit
            json.show_long_description false
            json.description stop_description
          else
            json.show_long_description true

            json.description stop_description[0..description_limit - 1]
          end
          json.long_description styling_start + ag.description + styling_end  rescue ""

          stop_description = ActionView::Base.full_sanitizer.sanitize(ag.directional_text.present? ? ag.directional_text : "")

          if stop_description.size < description_limit
            json.show_long_directional_text false
            json.directional_text stop_description
          else
            json.show_long_directional_text true

            json.directional_text stop_description[0..description_limit - 1]
          end 
          json.long_directional_text styling_start + ag.description.gsub('red','') + styling_end  rescue ""
        end
      end
    end
    # binding.pry

    stop.stop_details.each do |sd|
      json.stop_description sd.description
    end
    stop.stop_galleries.each do |sg|
      json.stop_gallery_name sg.name
      json.stop_galerry_image sg.image.present? ? sg.image.url : "no image"
    end

    @existing_path_points = []
    
    if @community.show_map
      
      if new_stops_arr[i-1].present? and new_stops_arr[i-1].is_a? Tour
        @existing_path_points << {x_plot: tour.x_plot, y_plot: tour.y_plot} if i == 0
        path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: nil).first
        if path.blank?
          path = Path.where(map_path_to_id: nil, map_path_from_id: stop.stop_id).first
          @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
        else
          @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
        end
         
      else
        unless skip_1_path
          path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: new_stops_arr[i-1].stop_id).first
          if path.blank?
            path = Path.where(map_path_to_id: new_stops_arr[i-1].stop_id, map_path_from_id: stop.stop_id).first
            @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
          else
            @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
          end
        else
          path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: new_stops_arr[i-2].stop_id).first
          if path.blank?
            path = Path.where(map_path_to_id: new_stops_arr[i-2].stop_id, map_path_from_id: stop.stop_id).first
            @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
          else
            @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
          end
        end
        
        # @existing_path_points << path.path_points.reorder('id ASC') if path.present?
      end
      skip_1_path = skip_1
    end  

    @existing_path_points.flatten!
    json.path_points @existing_path_points

    # binding.pry
    i+=1
    counter += 1
  end

end