i = 0
description_limit = ENV["DESCRIPTION_LIMIT"].to_i
need_original_id_arr = ["elevator", "building_starting_point"]
is_zerv_lock_present = false
is_igloohome_lock_present = false
is_latch_lock_present = false
is_edgestate_lock_present = false
is_dwello_lock_present = false
list_of_zerv_lock_ids = []
latch_connected_elevator_bluetooth_ids = []


styling_start = '<div style="font-family: gotham-light; color: white !important;"><p>'
styling_end = '</p></div>'
json.tours @tours do |tour|
  json.dwelo_guest_id @dwelo_guest_id.present? ? @dwelo_guest_id : ""
  json.id tour.id
  json.tour_key  @tour_user.tour_key
  json.community_id @community.id
  json.name @community&.community_tour&.name
  json.latitude @community&.community_tour&.x_plot
  json.longitude @community&.community_tour&.y_plot
  json.x_plot @community&.community_tour&.x_plot
  json.y_plot @community&.community_tour&.y_plot
  json.is_sitemap @community.is_sitemap
  json.community_locks_info @community.get_lock_info(styling_start, styling_end)

  plates_name = {}
  current_floor = nil
  current_building = nil
  next_floor = nil
  last_stop_id = nil
  unit_dlt_ids = []

  fs = @community.get_community_favorite_stop()
  favorite_unit_array = fs.favorite_units(@tour_user)
  favorite_amenity_array = fs.favorite_amenities(@tour_user)

  if @community.is_sitemap
    floorplate_image = @community.community_tour.image.present? ? @community.community_tour : (@community.is_sitemap ? @community.sitemap : @community.floorplates.first) rescue nil
    json.image floorplate_image.image.url rescue nil
    json.image_width @community.property_map_width(floorplate_image)
    json.image_height @community.property_map_height(floorplate_image)
  else
    @floorplate = @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    json.image @floorplate.image
    json.image_width @community.property_map_width(@floorplate)
    json.image_height @community.property_map_height(@floorplate)
  end

  if @community.show_map
    ts = @community.mdu ? tour.tour_stops.plotted_stops.where.not(id: @community.deleted_ids).order(:sort) : tour.tour_stops.plotted_stops.where.not(id: @community.deleted_ids, stop_type: "unit").order(:sort)
    ts1 = tour.tour_stops.plotted_stops.where(id: @community.deleted_ids).map{|x| x.id}

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

    scheduled_tour_stops = @community.community_tour_available_stops(@tour_user, tour)

    if @community.is_sitemap
      if scheduled_tour_stops.present?
        stops_arr = @community.mdu ? scheduled_tour_stops : scheduled_tour_stops.where.not(stop_type: "unit").order(:sort)
      else
        unoccupied = tour.tour_stops.plotted_stops.where(stop_type: "unit").map{|x| x.id if (u = Unit.find x.stop_id) and !u.available and !u.modal_unit }.compact
        stops_arr = @community.mdu ? tour.tour_stops.plotted_stops.where(display_stop: true).where.not(id: unoccupied).order(:sort) : tour.tour_stops.plotted_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
      end

      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop = stops_arr.compact[stop_count - 1]      
      last_stop_id = last_stop.id if last_stop.present?
      last_stop_desc = stops_arr.compact[stop_count - 1]
    else
      temp_max_floor = nil
      min_floor = @floor_list[0]
      @building_list << "" if @building_list == []
      @building_list.each do |building|

        # If no availble units or amenity in the building do not add elevator or staarting point in stops
        visible_stops_ids = tour.tour_stops.plotted_stops.where(stop_type: ["unit", "amenity"], display_stop: true).pluck(:stop_id)
        available_units_count = @community.units.where(id: visible_stops_ids, building: building, available: true).count
        available_amenities_count = @community.amenities.where(id: visible_stops_ids, building: building,breezway_lock_visible: true).count

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
              stops_arr << @community.community_tour #------- Adding starting point
              add_start = false

              begin
                if @community&.community_tour&.starting_floor.present? and @community&.community_tour&.starting_floor != min_floor #and !bsp.present?

                  first_floor_elev = @all_elevators.map{|x| x[0] if (@community&.community_tour&.building.present? ? x[2] == @community.community_tour.building : x[2] == building) and (@community.community_tour.starting_floor.present? ? (x[1].include? @community.community_tour.starting_floor) : (x[1].include? min_floor))}.compact.first
                  first_floor_elev = TourStop.find_by stop_id: first_floor_elev.id
                  if first_floor_elev.present?
                    first_floor_elev.floor = floor
                    first_floor_elev.building = building
                    stops_arr << first_floor_elev 
                  end
                end
              rescue => ex
              end
            end
            
            if add_bsp_entry
              stops_arr << bsp_stop
              add_bsp_entry  = false
            end

            begin
              if bsp.present? and bsp.floor != min_floor
                first_floor_elev = @all_elevators.map{|x| x[0] if ( x[2] == bsp.building ) and  (x[1].include? bsp.floor) }.compact.first
                first_floor_elev = TourStop.find_by stop_id: first_floor_elev.id
                if first_floor_elev.present?
                  first_floor_elev.floor = floor
                  first_floor_elev.building = building
                  stops_arr << first_floor_elev 
                end
              end
            rescue => ex
            end
            
            if @tour_sort_hash[building + ","+ floor.to_s].present?
              arr_to_remove =  @tour_sort_hash[building + ","+ floor.to_s].grep(/\d+/, &:to_i) - @community.deleted_ids 
              temp_max_floor = floor

              @tour_sort_hash[building + ","+ floor.to_s].each do |s_id|
                add_stop = TourStop.find_by_id(s_id)

                if add_stop.present?
                  add_stop.floor = floor
                  add_stop.building = building
                  next if (add_stop.check_unit_occupied())
                  next if add_start and ((add_stop.stop_type == "unit") or (add_stop.stop_type == "amenity"))

                  add_mdu = @community.mdu ? true : !(add_stop.stop_type == "unit")

                  if (add_mdu) and !(@community.deleted_ids.include? add_stop.id)
                    if (add_stop.is_a?(Tour)) || add_stop.stop_type === "elevator" || add_stop.stop_type === "building_starting_point"
                      if available_units_count > 0 || available_amenities_count > 0
                        stops_arr << add_stop
                      end

                    else
                      if scheduled_tour_stops.present?
                        stop_ids = scheduled_tour_stops.pluck(:id)

                        if stop_ids.include?(s_id.to_i)
                          stops_arr << add_stop 
                        end
                      else
                        stops_arr << add_stop if add_stop.display_stop
                      end
                    end

                    if add_stop.stop_type == "amenity" || add_stop.stop_type == "unit"
                      last_stop_id = add_stop.id
                      have_stop_in_building = true
                      
                      if first_floor_elev.present? && @community.community_tour.starting_floor.to_i == add_stop.floor
                        stops_arr = stops_arr - [first_floor_elev]
                        first_floor_elev = nil
                      end
                    end
                  end
                end
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
          end

        rescue => ex
        end

        have_stop_in_building = false
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



    stops = @community.mdu ? tour.tour_stops.plotted_stops : tour.tour_stops.plotted_stops.where.not(stop_type: "unit")
    stops_except_deleted = []
    stops_except_deleted << @community.community_tour if @community.is_sitemap

    stops_arr.compact.each do |stop|
      stops_except_deleted << stop unless (@community.deleted_ids.include?(stop.id) || unit_dlt_ids.include?(stop.id) )
    end
    
    stops_except_deleted << @community.community_tour if

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

      unoccupied = tour.tour_stops.plotted_stops.where(stop_type: "unit").map{|x| x.id if (u = Unit.find x.stop_id) and !u.available and !u.modal_unit}.compact
      stops_arr = @community.mdu ? tour.tour_stops.plotted_stops.where(display_stop: true).where.not(id: unoccupied).order(:sort) : tour.tour_stops.plotted_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
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
            unit_dlt_ids = []
            if  @tour_sort_hash[building + ","+ floor.to_s].present?
              arr_to_remove =  @tour_sort_hash[building + ","+ floor.to_s].grep(/\d+/, &:to_i) - ( @community.deleted_ids + unit_dlt_ids)
              
              if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.count == 1 && (min_floor != floor) && (arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.include? "elevator")
                begin
                  next
                rescue
                end
              end

              temp_max_floor = floor
              @tour_sort_hash[building + ","+ floor.to_s].each do |s_id|

                add_stop = TourStop.find_by_id(s_id)

                if add_stop.present?
                  next if (add_stop.check_unit_occupied())
                  add_mdu = @community.mdu ? true : !(add_stop.stop_type == "unit")
                  if (add_stop.display_stop && add_mdu) and !(@community.deleted_ids.include? add_stop.id)
                    stops_arr << add_stop 
                    last_stop_id = add_stop.id if add_stop.stop_type == "amenity" || add_stop.stop_type == "unit"
                  end
                end
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
  end
  

  hit = true
  once_flag = true
  counter = 0

  new_stops_arr = @community.get_stops_with_floor_and_buildings(new_stops_arr)

  if new_stops_arr[0].is_a? Tour
    json.navigation_title "Starting point"
  else
    json.navigation_title "First Stop: " + new_stops_arr[0].name if new_stops_arr[0].present?
  end

  skip_1 = false 
  skip_1_path = false

  # ///////////////////////////////////////////////////////////////////// Stop data //////////////////////////////////////////////////////
  if @community.auto_wayfinding
    if @community.is_sitemap
      mobile_path = ShortestPath.return_path_for_mobile(new_stops_arr, @community.id, 'sorting')
    else
      is_multiple_building, building_list = ShortestPath.check_stops_have_multiple_buildings(new_stops_arr, @community, @tour_user)
      if is_multiple_building
        new_stops_arr = ShortestPath.fetch_tour_stops_which_are_required_from_mobile_side_for_multiple(new_stops_arr, @community.id, @tour_user) # Here we add this community elevator and building start/exit for shortest path making
        mobile_path, new_stops_arr = ShortestPath.return_floorplate_mobile_path_for_multiple_buildings(new_stops_arr, building_list, @community.id, 'sorting', @tour_user)
      else
        new_stops_arr = ShortestPath.fetch_tour_stops_which_are_required_from_mobile_side(new_stops_arr, @community.id, @tour_user) # Here we add this community elevator for shortest path making        
        mobile_path, new_stops_arr = ShortestPath.return_floorplate_path_for_mobile(new_stops_arr, @community.id, 'sorting', @tour_user)
      end
    end
  end

  new_stops_arr = new_stops_arr.map{|x| x if ((x.is_a? Tour) or (x.stop_id.present?)) }.compact if new_stops_arr.present?
  
  json.tour_stop new_stops_arr.compact do |stop|
    list_of_zerv_lock_ids = []
    latch_connected_elevator_bluetooth_ids = []
    
    unless @community.auto_wayfinding
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
        skip_1 = true if ((new_stops_arr[counter + 1].is_a? TourStop) and new_stops_arr[counter + 1].stop_type == "elevator" and (new_stops_arr[counter + 2].floor rescue new_stops_arr[counter + 2].starting_floor) == (stop.floor rescue stop.starting_floor))
      rescue => ex
      end
    end

    if stop.is_a? TourStop
      if @community.show_map
        begin
          if (stop&.get_latitude&.to_i + stop&.get_longitude&.to_i) < 1
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

    json.stop_lock_provider ''

    navigation_title = ""
    bypass_stop_lock = false

    if new_stops_arr[counter + 1].is_a? Tour
      ((new_stops_arr.compact.size - 2) == counter) ? navigation_title = "Next Stop: Starting point" : navigation_title = "Next Stop: Starting point"
      bypass_stop_lock = true if !@community.is_sitemap && @community.community_tour.tour_setting.bypass_stop_lock_access && new_stops_arr[counter]&.stop_type == "elevator"
    elsif skip_1 and new_stops_arr[counter + 2].is_a? Tour
      ((new_stops_arr.compact.size - 2) == counter) ? navigation_title = "Next Stop: Starting point" : navigation_title = "Next Stop: Starting point"
      bypass_stop_lock = true if !@community.is_sitemap && @community.community_tour.tour_setting.bypass_stop_lock_access && new_stops_arr[counter]&.stop_type == "elevator"
    elsif  new_stops_arr.compact[counter + 1].present? and new_stops_arr.compact[counter + 1].id == last_stop_id
      navigation_title = @community.show_map ? ("Last Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      navigation_title = (new_stops_arr[counter + 1].present? && new_stops_arr[counter + 1].stop_type == "unit") ? new_stops_arr[counter + 1].get_unit_navigation_title(navigation_title) : navigation_title
      hit = false
      
    elsif last_stop_desc.present? && last_stop_desc.id == stop.id
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Last Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      navigation_title = (new_stops_arr[counter + 1].present? && new_stops_arr[counter + 1].stop_type == "unit") ? new_stops_arr[counter + 1].get_unit_navigation_title(navigation_title) : navigation_title
    elsif counter == 0
      navigation_title = @community.show_map ? ("First Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("First Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      navigation_title = (new_stops_arr[counter + 1].present? && new_stops_arr[counter + 1].stop_type == "unit") ? new_stops_arr[counter + 1].get_unit_navigation_title(navigation_title) : navigation_title
    elsif skip_1 and new_stops_arr[counter + 2].present?
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 2].name if new_stops_arr[counter + 2].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      navigation_title = (new_stops_arr[counter + 2].present? && new_stops_arr[counter + 2].stop_type == "unit") ? new_stops_arr[counter + 2].get_unit_navigation_title(navigation_title) : navigation_title
    elsif new_stops_arr[counter + 1].present?
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      navigation_title = (new_stops_arr[counter + 1].present? && new_stops_arr[counter + 1].stop_type == "unit") ? new_stops_arr[counter + 1].get_unit_navigation_title(navigation_title) : navigation_title
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
      json.unit_dwelo_lock_id ''
      json.igloohome_lock_id ''
      json.igloohome_guest_bluetooth_key ''
      json.igloohome_guest_pin ''
      json.igloohome_version ''
      json.lock_provider_mac_id ''
      json.list_of_zerv_lock_ids list_of_zerv_lock_ids
      json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
      json.navigation_title navigation_title
      json.bypass_stop_lock bypass_stop_lock
      json.id stop.id
      json.x_plot stop.x_plot
      json.y_plot stop.y_plot
      json.is_favorite false
      json.is_modal_unit false
      json.type "starting_point"
      json.name "Starting Point"
      json.directional_text counter != 0 ? "Your tour is completed! Now let's go back to where you started." : ""
      floorplate_image = @community.is_sitemap ? @community.sitemap : (stop.starting_floor.present? ? @community.floorplates.select{|x| x if x.floors.include?(stop.starting_floor.to_i)}.last : @community.floorplates.select{|x| x if x.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.min)}.last) rescue nil
      json.floorplate_image floorplate_image.image.url rescue ""
      json.image_width @community.property_map_width(floorplate_image)
      json.image_height @community.property_map_height(floorplate_image)
      
      @existing_path_points = []

      begin
        if counter == 0
          @existing_path_points = []
        else
          if @community.auto_wayfinding
            stop_id = TourStop.find(new_stops_arr[i-1].id).stop_type == "elevator" ? TourStop.find(new_stops_arr[i-1].id).stop_id : new_stops_arr[i-1].id
            path_points = ShortestPath.return_path_points_to_mobile(mobile_path, "TourStop", "Tour", stop_id, 0)
            @existing_path_points = path_points if path_points.present?
          else
            path = Path.where(map_path_to_id: nil, map_path_from_id: new_stops_arr[i-1].stop_id).first
            if path.blank?
              path = Path.where(map_path_to_id:  new_stops_arr[i-1].stop_id, map_path_from_id: nil).first
              @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
            else
              @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
            end
          end
        end

      rescue => ex
        @existing_path_points = []
      end

      if @community.auto_wayfinding
        json.path_points @existing_path_points
      else
        json.path_points @existing_path_points[0].present? ? (@existing_path_points[0].class == Hash ? [@existing_path_points[0]] : @existing_path_points[0]) : @existing_path_points
      end

      json.stop_description ((new_stops_arr.size - 1) == counter ? "Your Tour Has Ended" : "Starting point")
      counter = counter + 1
      i += 1
      
      begin
      if counter == 1 and @community.enable_locks and @tour_user.tour_type != "virtual_tour"
        stop_lock_provider = stop.lock_provider
        json.stop_lock_provider stop_lock_provider
        
        if stop_lock_provider == "Latch" and @community.latch.present? and stop.latch_locks.present?
          lch = ShortestPath.return_stop_lock(stop) if @community.latch.present?
          if lch.present?
            latch_guest = @tour_user.latch_guests.find_by(community_id: @community.id, guest_of_stop_id: stop.latch_locks.first.stop_id, guest_of_stop_type: "Tour", status: "active") if @tour_user.present?
            if latch_guest.present?
              is_latch_lock_present = true
              json.guest_pin ''
              json.latch_link latch_guest.latch_link
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id ''
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            else
              json.stop_lock_provider ''
              json.guest_pin ''
              json.latch_link ''
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id ''
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            end
          else
            json.stop_lock_provider ''
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "EdgeState" and @community.edge_state.present? and stop.edgestate_locks.present?
          rml = ShortestPath.return_stop_lock(stop) if @community.edge_state.present?
          if rml.present?
            if @tour_user.present? and @tour_user.as_guests.find_by(community_id: @community.id).present?
              igloo_guest = IglooGuest.find_by(stop_id: stop.edgestate_locks.first.stop_id, tour_user_id: @tour_user.id, status: "active")
              is_edgestate_lock_present = true
              if igloo_guest.nil? 
                pin = @tour_user.as_guests.find_by(community_id: @community.id).edgestate_pin if @tour_user.as_guests.find_by(community_id: @community.id).present?
                json.guest_pin "Use code " + pin + "# to enter." if pin.present? and rml.remote_lock_type != "igloo_lock"
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id ''
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              else
                json.guest_pin "Use code " + igloo_guest.guest_code + " to enter." if igloo_guest.guest_code.present?
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id ''
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              end
            else
              json.guest_pin ''
              json.latch_link ''
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id ''
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            end
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "Zerv" and @community.zerv.present? and stop.zerv_locks.present?
          zrv = ShortestPath.return_stop_lock(stop) if @community.zerv.present?
          if zrv.present?
            zrv_guest = @tour_user.zerv_guests.find_by(community_id: @community.id, guest_of_stop_type: "Tour", guest_of_stop_id: stop.id, status: "active")
            if zrv_guest.present?
              is_zerv_lock_present = true
              json.guest_pin 'Your tour has started. Tap the unlock button below when you are near the fob reader. Enjoy your tour!'
              json.latch_link ''
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id zrv.mac_id
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            else
              zrv_guest = @tour_user.zerv_guests.find_by(community_id: @community.id, status: "active")
              if zrv_guest.present?
                is_zerv_lock_present = true
                json.guest_pin zrv_guest.res_errors.nil? ? '' : zrv_guest.res_errors["error_position"]
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id zrv.mac_id
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              else
                json.guest_pin ''
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id zrv.mac_id
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              end
            end
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "Dwelo"
          dwelo_lock = ShortestPath.return_stop_lock(stop)
          if dwelo_lock.present?
            is_dwello_lock_present = true
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id dwelo_lock.device_id
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "Manual"
          if stop.present? and stop.access_code.present?
            json.guest_pin "Use code " + stop.access_code + " to enter."
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end
        
        elsif stop_lock_provider == "Igloohome"
          igloohome_guest = IgloohomeGuest.where(tour_user_id: @tour_user.id, community_id: @community.id, stop_id: stop.id, stop_type: stop.class.name).last
          igloohome_lock = IgloohomeLock.where(igloohome_id:  @community.igloohome.id, stop_id: stop.id, stop_type: stop.class.name).last
         
          if igloohome_guest.present? && igloohome_lock.present? && igloohome_lock.device_id.present? && (igloohome_guest.guest_bluetooth_key.present? || igloohome_guest.guest_pin.present?)
            is_igloohome_lock_present = true
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id igloohome_lock.device_id
            json.igloohome_guest_bluetooth_key igloohome_guest.guest_bluetooth_key
            json.igloohome_version @community&.igloohome&.version
            json.igloohome_guest_pin igloohome_guest.guest_pin
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.stop_lock_provider ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end
        else
          json.guest_pin ''
          json.latch_link ''
          json.unit_dwelo_lock_id ''
          json.igloohome_lock_id ''
          json.igloohome_guest_bluetooth_key ''
          json.igloohome_version ''
          json.igloohome_guest_pin ''
          json.lock_provider_mac_id ''
          json.list_of_zerv_lock_ids list_of_zerv_lock_ids
          json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
        end


      else
        json.guest_pin ''
        json.latch_link ''
        json.unit_dwelo_lock_id ''
        json.igloohome_lock_id ''
        json.igloohome_guest_bluetooth_key ''
        json.igloohome_version ''
        json.igloohome_guest_pin ''
        json.lock_provider_mac_id ''
        json.list_of_zerv_lock_ids list_of_zerv_lock_ids
        json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
      end
      rescue => exception
        json.guest_pin ''
        json.latch_link ''
        json.unit_dwelo_lock_id ''
        json.igloohome_lock_id ''
        json.igloohome_guest_bluetooth_key ''
        json.igloohome_version ''
        json.igloohome_guest_pin ''
        json.lock_provider_mac_id ''
        json.list_of_zerv_lock_ids list_of_zerv_lock_ids
        json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
      end

      next
    end
    begin
      
      if @community.enable_locks and @tour_user.tour_type != "virtual_tour"
        stop_lock_provider = stop.fetch_lock_stop_provider
        json.stop_lock_provider stop_lock_provider

        if stop_lock_provider == "EdgeState"
          _stop_ = stop.stop_type.classify.constantize.find_by_id stop.stop_id
          rml = ShortestPath.return_stop_lock(_stop_) if @community.edge_state.present?
          if rml.present?
            if @tour_user.present? and @tour_user.as_guests.find_by(community_id: @community.id).present?
              igloo_guest = IglooGuest.find_by(stop_id: stop.stop_id, tour_user_id: @tour_user.id, status: "active")
              is_edgestate_lock_present = true
              if igloo_guest.nil? 
                pin = @tour_user.as_guests.find_by(community_id: @community.id).edgestate_pin if @tour_user.as_guests.find_by(community_id: @community.id).present?
                json.guest_pin "Use code " + pin + "# to enter." if pin.present? and rml.remote_lock_type != "igloo_lock"
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id ''
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              else
                json.guest_pin "Use code " + igloo_guest.guest_code + " to enter." if igloo_guest.guest_code.present?
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id ''
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              end
            else
              json.guest_pin ''
              json.latch_link ''
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id ''
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            end
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "Latch"
          _stop_ = stop.stop_type.classify.constantize.find_by_id stop.stop_id
          lch = ShortestPath.return_stop_lock(_stop_) if @community.latch.present?
          
          if lch.present?
            if lch.stop_type == "Door"
              latch_guest = @tour_user.latch_guests.find_by(community_id: @community.id, guest_of_stop_id: lch.stop.id, guest_of_stop_type: lch.stop.class.name, status: "active") if @tour_user.present?
            else
              latch_guest = @tour_user.latch_guests.find_by(community_id: @community.id, guest_of_stop_id: stop.stop_id, guest_of_stop_type: stop.stop_type.classify, status: "active") if @tour_user.present?
            end

            if latch_guest.present?
              latch_connected_elevator_bluetooth_ids = @tour_user.get_latch_connected_elevator_bluetooth_ids(@community.id, stop)
              is_latch_lock_present = true
              json.guest_pin ''
              json.latch_link latch_guest.latch_link
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id ''
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            else
              json.stop_lock_provider ''
              json.guest_pin ''
              json.latch_link ''
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id ''
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            end
          else
            json.stop_lock_provider ''
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "Dwelo"
          _stop_ = stop.stop_type.classify.constantize.find_by_id stop.stop_id
          dwelo_lock = ShortestPath.return_stop_lock(_stop_)
          
          if dwelo_lock.present?
            is_dwello_lock_present = true
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id dwelo_lock.device_id
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "Zerv"
          _stop_ = stop.stop_type.classify.constantize.find_by_id stop.stop_id
          zrv = ShortestPath.return_stop_lock(_stop_) if @community.zerv.present?
          if zrv.present?
            zrv_guest = @tour_user.zerv_guests.find_by(community_id: @community.id, guest_of_stop_type: stop.stop_type.classify, guest_of_stop_id: stop.stop_id, status: "active")
            if zrv_guest.present?
              is_zerv_lock_present = true
              list_of_zerv_lock_ids = @tour_user.get_list_of_zerv_lock_ids(tour, @community, stop, new_stops_arr, counter, zrv.mac_id)
              json.guest_pin 'Tap the unlock button below when you are near the fob reader'
              json.latch_link ''
              json.unit_dwelo_lock_id ''
              json.igloohome_lock_id ''
              json.igloohome_guest_bluetooth_key ''
              json.igloohome_version ''
              json.igloohome_guest_pin ''
              json.lock_provider_mac_id zrv.mac_id
              json.list_of_zerv_lock_ids list_of_zerv_lock_ids
              json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
            else
              zrv_guest = @tour_user.zerv_guests.find_by(community_id: @community.id, status: "active")
              if zrv_guest.present?
                is_zerv_lock_present = true
                json.guest_pin zrv_guest.res_errors.nil? ? '' : zrv_guest.res_errors["error_position"]
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id zrv.mac_id
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              else
                json.guest_pin ''
                json.latch_link ''
                json.unit_dwelo_lock_id ''
                json.igloohome_lock_id ''
                json.igloohome_guest_bluetooth_key ''
                json.igloohome_version ''
                json.igloohome_guest_pin ''
                json.lock_provider_mac_id zrv.mac_id
                json.list_of_zerv_lock_ids list_of_zerv_lock_ids
                json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
              end
            end
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end
        
        elsif stop_lock_provider == "Igloohome"
          igloohome_lock = @community.get_igloohome_lock(stop)
          igloohome_guest = @community.get_igloohome_guest(stop, @tour_user.id)         
          
          if igloohome_guest.present? && igloohome_lock.present? && igloohome_lock.device_id.present? && (igloohome_guest.guest_bluetooth_key.present? || igloohome_guest.guest_pin.present?)
            is_igloohome_lock_present = true
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id igloohome_lock.device_id
            json.igloohome_guest_bluetooth_key igloohome_guest.guest_bluetooth_key
            json.igloohome_version @community&.igloohome&.version
            json.igloohome_guest_pin igloohome_guest.guest_pin
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.stop_lock_provider ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end

        elsif stop_lock_provider == "Manual"
          _stop_ = stop.stop_type.classify.constantize.find_by_id stop.stop_id
          if (defined?(_stop_.door).present? && _stop_.door.present?) ||  (defined?(_stop_.doors).present? && _stop_.doors.any?)
            _stop_ = defined?(_stop_.door).present? ? _stop_.door : (_stop_.doors.order("created_at ASC").first)
          end
          if _stop_.present? and _stop_.access_code.present?
            json.guest_pin "Use code " + _stop_.access_code + " to enter."
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          else
            json.guest_pin ''
            json.latch_link ''
            json.unit_dwelo_lock_id ''
            json.igloohome_lock_id ''
            json.igloohome_guest_bluetooth_key ''
            json.igloohome_version ''
            json.igloohome_guest_pin ''
            json.lock_provider_mac_id ''
            json.list_of_zerv_lock_ids list_of_zerv_lock_ids
            json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
          end
        else
          json.guest_pin ''
          json.latch_link ''
          json.unit_dwelo_lock_id ''
          json.igloohome_lock_id ''
          json.igloohome_guest_bluetooth_key ''
          json.igloohome_version ''
          json.igloohome_guest_pin ''
          json.lock_provider_mac_id ''
          json.list_of_zerv_lock_ids list_of_zerv_lock_ids
          json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
        end
      else
        json.guest_pin ''
        json.latch_link ''
        json.unit_dwelo_lock_id ''
        json.igloohome_lock_id ''
        json.igloohome_guest_bluetooth_key ''
        json.igloohome_version ''
        json.igloohome_guest_pin ''
        json.lock_provider_mac_id ''
        json.list_of_zerv_lock_ids list_of_zerv_lock_ids
        json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
      end
    rescue => pin
      json.guest_pin ''
      json.latch_link ''
      json.unit_dwelo_lock_id ''
      json.igloohome_lock_id ''
      json.igloohome_guest_bluetooth_key ''
      json.igloohome_version ''
      json.igloohome_guest_pin ''
      json.lock_provider_mac_id ''
      json.list_of_zerv_lock_ids list_of_zerv_lock_ids
      json.latch_connected_elevator_bluetooth_ids latch_connected_elevator_bluetooth_ids
    end
    
    json.navigation_title navigation_title
    json.bypass_stop_lock bypass_stop_lock
    json.id stop.id rescue next
    json.x_plot stop&.get_latitude&.to_i rescue next
    json.y_plot stop&.get_longitude&.to_i
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

      json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit&.floorplan&.image.present? ? unit&.floorplan&.image.url : "no image" rescue "no image") ): "no image"
      images = []

      if (unit.image.present? || unit&.floorplan&.image.present? rescue false)
        img = {url: unit.image.present? ? unit.image.url : unit&.floorplan&.image.url }
        images << img
      end
      if (unit.secondary_image.present? || unit&.floorplan&.secondary_image.present? rescue false)
        img = {url: unit.secondary_image.present? ? unit.secondary_image.url : unit&.floorplan&.secondary_image&.url }
        images << img
      end

      current_floor = unit.floor
      json.image_list images
      json.name unit.api_unit_marketing_name
      json.floorplan_id unit&.floorplan&.id
      floorplate_image = (unit.floorplate.image.present? ? unit.floorplate : nil) if unit.floorplate.present?  rescue nil
      json.floorplate_image floorplate_image.image.url  rescue ""
      json.image_width @community.property_map_width(floorplate_image)
      json.image_height @community.property_map_height(floorplate_image)
      json.update_apply ((unit.provider == "resman" || unit.provider == "psi") && (@community.credential.present? and @community.credential.apply_now != "separate_link")) ? true : false
      json.provider unit.provider

      unit_directional_text = ActionView::Base.full_sanitizer.sanitize(unit.stop_description.present? ? unit.stop_description : "")
      show_long_directional_text = unit_directional_text.size <= description_limit ? false : true

      json.directional_text show_long_directional_text ? unit_directional_text[0..description_limit - 1] : stop.get_stop_directional_text(unit_directional_text)
      json.show_long_directional_text show_long_directional_text
      json.long_directional_text styling_start + ( unit.stop_description.present? ? unit.stop_description : stop.get_stop_directional_text(unit_directional_text) ).gsub('red','') + styling_end rescue ""

      json.video_link_button_label unit.virtual_tour_button_label.present? ? unit.virtual_tour_button_label : unit&.floorplan&.virtual_tour_button_label
      json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ( unit&.floorplan.present? && unit&.floorplan&.virtual_tour_url.present? ) ? unit&.floorplan&.virtual_tour_url : ""
      lease_pricing = []

      if unit.lease_pricing.present? && !unit.modal_unit && @community.display_pricing_options
        str_split = unit.lease_pricing.split(';')
        str_split.each do |ss|
          str = ss.split(':')
          if str[1].to_i > 0
            pricing_str = str[0]+" Month - #{@community.get_currency_symbol}"+str[1].to_i.to_s
            lease_pricing << pricing_str
          end
        end

        lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
        lease_pricing2 = []
        lease_pricing.each do |lp|
          lease_pricing2 << {"pricing_option" => lp}
        end
        lease_pricing = lease_pricing2
      else
        h = {"pricing_option" => @community.get_currency_symbol + unit.effective_rent.to_i.to_s}
        lease_pricing << h
      end

      if unit.modal_unit
        lease_pricing = []
        @units = Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', unit&.floorplan_id,unit.community_id,true) if unit.present?
        @units.each do |floorplan_unit|
          unless floorplan_unit.id == unit.id
            pricing_str = {"pricing_option" => floorplan_unit.marketing_name + " #{@community.get_currency_symbol}" + floorplan_unit.effective_rent.to_i.to_s} rescue next
            lease_pricing << pricing_str
          end
        end
        lease_pricing = lease_pricing.sort_by!(&:zip)
      end

      additional_details = unit.description.present? ? unit.description :  unit&.floorplan.description        
      unit_stop_description = stop.stop_description_formatting(additional_details) #ActionView::Base.full_sanitizer.sanitize(additional_details.present? ? additional_details : "")
      show_long_description = (unit_stop_description.size <= description_limit) ? false : true
      long_stop_description = (additional_details.present? ? (styling_start + additional_details.gsub('red','') + styling_end  rescue "") : nil)

      stop_data = {
        "floorplan" => (unit&.floorplan&.name rescue ""), 
        "floorplan_full_name" => (unit&.floorplan&.name + "- #{(unit&.floorplan&.bedrooms.present? ? (unit&.floorplan&.bedrooms.to_i.to_s + " BR") : "") } / #{(unit&.floorplan&.bathrooms.present? ? (unit&.floorplan&.bathrooms.to_i.to_s + " BA") : "" )}" rescue ""),
        "effective_rent" => unit.effective_rent,
        "available_date" => unit.available_date, 
        "display_rent" => @community.display_rent, 
        "display_pricing_options" => @community.display_pricing_options, 
        "lease_pricing" => lease_pricing,
        "availability" => unit.availability,
        "stop_description" => show_long_description ? unit_stop_description[0..description_limit - 1] : unit_stop_description,
        "show_long_description" => show_long_description, 
        "long_stop_description" => long_stop_description, 
        "availability_url "=> unit.get_availability_url()
      }
      
      json.stop_data stop_data

      json.availability_url unit.get_availability_url()

      @unit_amenities = unit.amenities
      unit_amenities_hit = true

      #////////////////////////////////////////// Unit Amenities NOTT Plotted ////////////////////////////////////////////
      
      json.unit_unploted_amenities @unit_amenities.order(:sort) do |unit_amenity|
        
        if unit_amenity.x_plot.nil? || (unit_amenity.x_plot + unit_amenity.y_plot == 0)
          unit_amenities_hit = false
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.name unit_amenity.name
          json.image unit_amenity.image.present? ? (unit_amenity.crop_x.present? ? unit_amenity.image.url + "?temp/"+unit_amenity.crop_x.to_s :  unit_amenity.image.url ): "no image"
          json.stop_description stop.stop_description_formatting(unit_amenity.description) #ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")
          json.directional_text ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")
          json.video_link_button_label unit.virtual_tour_button_label.present? ? unit.virtual_tour_button_label : unit&.floorplan&.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ?  unit.virtual_tour_url : ( unit&.floorplan.present? && unit&.floorplan&.virtual_tour_url.present? ) ? unit&.floorplan&.virtual_tour_url : ""
          
          if unit_amenity.amenity_galleries.count == 0
            json.gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => stop.stop_description_formatting(unit_amenity.description), "directional_text" => ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")]
          else
            amenityGalleryArr = []
            amenityGalleryArr << unit_amenity
            unit_amenity.amenity_galleries.order(:sort).each do |amen|
              amenityGalleryArr << amen
            end
            json.gallery amenityGalleryArr do |ag|
              json.name ag.name
              json.image ag.image.url
              json.description stop.stop_description_formatting(ag.description) #ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")
              json.directional_text ActionView::Base.full_sanitizer.sanitize(ag.directional_text.present? ? ag.directional_text : "")
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
          unit_amenity_stop_description = stop.stop_description_formatting(unit_amenity.description) #ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")

          if unit_amenity_stop_description.size <= description_limit
            json.show_long_description false
            json.stop_description unit_amenity_stop_description
          else
            json.show_long_description true
            json.stop_description unit_amenity_stop_description[0..description_limit - 1]
          end

          json.long_stop_description styling_start + unit_amenity.description.gsub('red','') + styling_end  rescue ""

          unit_amenity_directional_text = ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")
          
          if unit_amenity_directional_text.size <= description_limit
            json.show_long_directional_text false
            json.directional_text unit_amenity_directional_text
          else
            json.show_long_directional_text true
            json.directional_text unit_amenity_directional_text[0..description_limit - 1]
          end

          json.long_directional_text styling_start + unit_amenity.directional_text.gsub('red','') + styling_end  rescue ""
          json.video_link_button_label unit.virtual_tour_button_label.present? ? unit.virtual_tour_button_label : unit&.floorplan&.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ?  unit.virtual_tour_url : ( unit&.floorplan.present? && unit&.floorplan&.virtual_tour_url.present? ) ? unit&.floorplan&.virtual_tour_url : ""
          
          if unit_amenity.amenity_galleries.count == 0
            stop_description = stop.stop_description_formatting(unit_amenity.description) #ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")

            if stop_description.size <= description_limit
              show_long_description = false
            else
              show_long_description = true
            end

            directional_text = ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")

            if directional_text.size <= description_limit
              show_directional_text = false
            else
              show_directional_text = true
            end

            json.gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => show_long_description ? stop_description[0..description_limit - 1] : stop_description,"show_long_description" => show_long_description ,"long_description" => (styling_start + unit_amenity.description.gsub('red','') + styling_end  rescue ""), "directional_text" => show_directional_text ? directional_text[0..description_limit - 1] : directional_text,"show_long_directional_text" => show_directional_text,"long_directional_text" => (styling_start + unit_amenity.directional_text.gsub('red','') + styling_end  rescue "")]
          else

            amenityGalleryArr = []
            amenityGalleryArr << unit_amenity
            unit_amenity.amenity_galleries.order(:sort).each do |amen|
              amenityGalleryArr << amen
            end

            json.gallery amenityGalleryArr do |ag|
              json.name ag.name
              json.image ag.image.url
              stop_description = stop.stop_description_formatting(ag.description) #ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")

              if stop_description.size <= description_limit
                json.show_long_description false
                json.description stop_description
              else
                json.show_long_description true

                json.description stop_description[0..description_limit - 1]
              end
              json.long_description styling_start + ag.description.gsub('red','') + styling_end  rescue ""

              stop_description = ActionView::Base.full_sanitizer.sanitize(ag.directional_text.present? ? ag.directional_text : "")

              if stop_description.size <= description_limit
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
    end

    elsif stop.stop_type == "building_starting_point"
      bsp = BuildingStartingPoint.find_by_id stop.stop_id
      json.type "starting_point"
      json.name bsp&.name
      json.directional_text stop.get_stop_directional_text(bsp&.directional_text)
      floorplate_image = @community.floorplates.map{|x| x if (x.floors.include? bsp&.floor)}.compact.first rescue nil
      json.floorplate_image floorplate_image&.image&.url  rescue ""
      json.image_width @community.property_map_width(floorplate_image)
      json.image_height @community.property_map_height(floorplate_image)

    elsif stop.stop_type == "elevator"
      elevator = Elevator.find_by_id stop.stop_id
      json.image elevator.image.present? ? elevator.image.url : asset_path("elev2.png")
      json.name "Elevator"
      json.name elevator.name
      
      elevator_directional_text = ActionView::Base.full_sanitizer.sanitize(elevator.directional_text.present? ? elevator.directional_text : "")
      show_long_directional_text = elevator_directional_text.size <= description_limit ? false : true
      
      json.directional_text show_long_directional_text ? elevator_directional_text[0..description_limit - 1] : stop.get_stop_directional_text(elevator_directional_text)
      json.long_directional_text styling_start + (elevator.directional_text.present? ? elevator&.directional_text : stop.get_stop_directional_text(elevator_directional_text) )&.gsub('red','') + styling_end
      json.show_long_directional_text show_long_directional_text

      json.video_link_button_label ""
      json.video_link ""
      json.elevator_description ActionView::Base.full_sanitizer.sanitize(elevator.description)
      json.elevator_long_description styling_start + elevator.description.gsub('red','') + styling_end
      
      if @community.auto_wayfinding
        from_type = (new_stops_arr[i-1].is_a? Tour) ? "Tour" : "TourStop"
        to_type = (new_stops_arr[i].is_a? Tour) ? "Tour" : "TourStop"
        from_id = (new_stops_arr[i-1].is_a? Tour) ? 0 : new_stops_arr[i - 1].id
        to_id = (new_stops_arr[i].is_a? Tour) ? 0 : new_stops_arr[i].id
        from_id = (from_type == "TourStop" && need_original_id_arr.include?( TourStop.find(from_id).stop_type ) ) ? TourStop.find(from_id).stop_id : from_id
        to_id = (to_type == "TourStop" && need_original_id_arr.include?( TourStop.find(to_id).stop_type ) ) ? TourStop.find(to_id).stop_id : to_id
        next_floor = ShortestPath.return_next_floor_to_mobile(mobile_path, from_type, to_type, from_id, to_id)
        elevator_stop_description = ELEVATOR_STOP_TEXT + next_floor.to_s
      else
        if new_stops_arr.compact[counter + 1].present?
          next_stop = new_stops_arr.compact[counter + 1]
          next_stop = next_stop.stop_type.classify.constantize.find next_stop.stop_id rescue nil
          if next_stop.is_a? Elevator
            next_floor = current_floor
            elevator_stop_description = ""

            if hit
              current_stop = stop.stop_type.classify.constantize.find stop.stop_id rescue nil
              elevator_stop_description = current_stop.floors.present? ? ELEVATOR_STOP_TEXT + (plates_name[current_stop.floors.max.to_s].present? ? plates_name[current_stop.floors.max.to_s] : current_stop.floors.max.to_s rescue current_stop.floors.max.to_s) : "" rescue ""
            else
              current_stop = stop.stop_type.classify.constantize.find stop.stop_id rescue nil
              elevator_stop_description =  current_stop.floors.present? ? ELEVATOR_STOP_TEXT + (plates_name[current_stop.floors.min.to_s].present? ? plates_name[current_stop.floors.min.to_s] : current_stop.floors.min.to_s rescue current_stop.floors.min.to_s) : "" rescue ""
            end
            if current_stop.present? and next_stop.present? and current_stop.building.present? and next_stop.building.present? and current_stop.building != next_stop.building
              elevator_stop_description =  ELEVATOR_STOP_TEXT + (plates_name[next_stop.floors.min.to_s].present? ? plates_name[next_stop.floors.min.to_s] : next_stop.floors.min.to_s rescue next_stop.floors.min.to_s) rescue elevator_stop_description           
            end
          else
            elevator_stop_description =  next_stop.floor.present? ? ELEVATOR_STOP_TEXT + (plates_name[next_stop.floor.to_s].present? ? plates_name[next_stop.floor.to_s] : next_stop.floor.to_s rescue next_stop.floor.to_s) : "" rescue ""
            next_floor  = next_stop.floor.to_i rescue current_floor
          end
          if new_stops_arr.compact[counter + 1].is_a? Tour
            fl_text = (new_stops_arr.compact[counter + 1].starting_floor.present? ? new_stops_arr.compact[counter + 1].starting_floor : min_floor).to_s
            elevator_stop_description = ELEVATOR_STOP_TEXT + (plates_name[fl_text].present? ? plates_name[fl_text] : fl_text rescue fl_text)
            next_floor  = (new_stops_arr.compact[counter + 1].starting_floor.present? ? new_stops_arr.compact[counter + 1].starting_floor : current_floor).to_i
          end

        else
          
          elevator_stop_description = ELEVATOR_STOP_TEXT + (plates_name[min_floor.to_s].present? ? plates_name[min_floor.to_s] : min_floor.to_s rescue min_floor.to_s)
        end
      end

      elevator_stop_description = elevator_stop_description.present? ? "#{elevator_stop_description}." : elevator_stop_description

      if current_floor.present?
        floor_image = @community.floorplates.map{|x| x if x.floors.include?(current_floor)}.compact.last rescue nil
        floor_image = (floor_image || elevator.floorplate) rescue nil
        json.floorplate_image floor_image.image.url  rescue ""
        json.image_width @community.property_map_width(floor_image)
        json.image_height @community.property_map_height(floor_image)
        if new_stops_arr[counter - 1].is_a? Tour 
          floorplate_image = @community.floorplates.map{|x| x if x.floors.include?(@community.community_tour.starting_floor.present? ? @community.community_tour.starting_floor : min_floor)}.compact.last rescue nil
          json.floorplate_image floorplate_image.image.url rescue ""
          json.image_width @community.property_map_width(floorplate_image)
          json.image_height @community.property_map_height(floorplate_image)
        end
      else
        floorplate_image = (elevator.floorplate.image.present? ? elevator.floorplate : nil) if elevator.floorplate.present? rescue nil
        json.floorplate_image floorplate_image.image.url rescue ""
        json.image_width @community.property_map_width(floorplate_image)
        json.image_height @community.property_map_height(floorplate_image)
        if new_stops_arr[counter - 1].is_a? Tour 
          floorplate_image = @community.floorplates.map{|x| x if x.floors.include?(@community.community_tour.starting_floor.present? ? @community.community_tour.starting_floor : min_floor)}.compact.last rescue nil
          json.floorplate_image floorplate_image.image.url rescue ""
          json.image_width @community.property_map_width(floorplate_image)
          json.image_height @community.property_map_height(floorplate_image)
        end
      end

      json.stop_description elevator_stop_description
      
      if elevator.elevator_galleries.count == 0
        json.gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator_stop_description, "directional_text" => ActionView::Base.full_sanitizer.sanitize(elevator.directional_text)]
      else
        elevatorGalleryArr = []
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
      stop_description = stop.stop_description_formatting(amenity.description) #ActionView::Base.full_sanitizer.sanitize(amenity.description.present? ? amenity.description : "")

      if stop_description.size <= description_limit
        json.show_long_description false
        json.stop_description stop_description
      else
        json.show_long_description true

        json.stop_description stop_description[0..description_limit - 1]
      end

      json.long_stop_description styling_start + amenity.description.gsub('red','') + styling_end  rescue ""
      current_floor = amenity.floor
      json.name amenity.name

      amenity_directional_text = ActionView::Base.full_sanitizer.sanitize(amenity.directional_text.present? ? amenity.directional_text : "")
      show_long_directional_text = amenity_directional_text.size <= description_limit ? false : true

      json.directional_text show_long_directional_text ? amenity_directional_text[0..description_limit - 1] : stop.get_stop_directional_text(amenity_directional_text)
      json.show_long_directional_text show_long_directional_text
      json.long_directional_text styling_start + ( amenity.directional_text.present? ? amenity.directional_text : stop.get_stop_directional_text(amenity_directional_text) )&.gsub('red','') + styling_end  rescue ""

      json.video_link_button_label amenity.video_link_button_label
      json.video_link amenity.video_link.present? ? amenity.video_link : ""
      floorplate_image = (amenity.amenityable.image.url.present? ? amenity.amenityable : nil) if amenity.amenityable.present? rescue nil
      json.floorplate_image floorplate_image.image.url  rescue 0
      json.image_width @community.property_map_width(floorplate_image)
      json.image_height @community.property_map_height(floorplate_image)
      json.is_favorite favorite_amenity_array.include?(stop.stop_id.to_s) ? true : false
      if amenity.amenity_galleries.count == 0
         stop_description = stop.stop_description_formatting(amenity.description) #ActionView::Base.full_sanitizer.sanitize(amenity.description.present? ? amenity.description : "")

        if stop_description.size <= description_limit
          show_long_description = false
        else
          show_long_description = true
        end

        directional_text = ActionView::Base.full_sanitizer.sanitize(amenity.directional_text.present? ? amenity.directional_text : "")
        show_directional_text = directional_text.size <= description_limit ? false : true

        json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image","show_long_description" => show_long_description,"long_description" => (styling_start + amenity.description.gsub('red', '') + styling_end  rescue ""), "description" => show_long_description ? stop_description[0..description_limit - 1] : stop_description,"stop_description" => (styling_start + amenity.description.gsub('red','') + styling_end  rescue ""),"show_long_directional_text" => show_directional_text, "directional_text" => show_directional_text ? directional_text[0..description_limit - 1] : directional_text,"long_directional_text" => (styling_start + amenity.directional_text.gsub('red','') + styling_end  rescue "")]
      else
        amenityGalleryArr = []
        amenityGalleryArr << amenity

        amenity.amenity_galleries.order(:sort).each do |amen|
          amenityGalleryArr << amen
        end
        
        json.gallery amenityGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url
          stop_description = stop.stop_description_formatting(ag.description) #ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")

          if stop_description.size <= description_limit
            json.show_long_description false
            json.description stop_description
          else
            json.show_long_description true

            json.description stop_description[0..description_limit - 1]
          end

          json.long_description styling_start + ag.description.gsub('red', '') + styling_end  rescue ""

          stop_description = ActionView::Base.full_sanitizer.sanitize(ag.directional_text.present? ? ag.directional_text : "")

          if stop_description.size <= description_limit
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

    stop.stop_details.each do |sd|
      json.stop_description sd.description
    end
    stop.stop_galleries.each do |sg|
      json.stop_gallery_name sg.name
      json.stop_galerry_image sg.image.present? ? sg.image.url : "no image"
    end

    @existing_path_points = []
    
    if @community.show_map
      if @community.auto_wayfinding
        from_type = (new_stops_arr[i-1].is_a? Tour) ? "Tour" : "TourStop"
        to_type = (new_stops_arr[i].is_a? Tour) ? "Tour" : "TourStop"
        from_id = (new_stops_arr[i-1].is_a? Tour) ? 0 : new_stops_arr[i - 1].id
        to_id = (new_stops_arr[i].is_a? Tour) ? 0 : new_stops_arr[i].id
        if @community.is_sitemap
          path_points = ShortestPath.return_path_points_to_mobile(mobile_path, from_type, to_type, from_id, to_id)
        else
          from_id = (from_type == "TourStop" && need_original_id_arr.include?( TourStop.find(from_id).stop_type) ) ? TourStop.find(from_id).stop_id : from_id
          to_id = (to_type == "TourStop" && need_original_id_arr.include?( TourStop.find(to_id).stop_type ) ) ? TourStop.find(to_id).stop_id : to_id
          path_points = ShortestPath.return_path_points_to_mobile(mobile_path, from_type, to_type, from_id, to_id)     
        end
        @existing_path_points = path_points if path_points.present?
      else
        if new_stops_arr[i-1].present? and new_stops_arr[i-1].is_a? Tour
          @existing_path_points << {x_plot: @community.community_tour.x_plot, y_plot: @community.community_tour.y_plot} if i == 0
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
        end
      end
      skip_1_path = skip_1
    end  

    @existing_path_points.flatten! unless @community.auto_wayfinding
    json.path_points @existing_path_points
    json.is_modal_unit (stop.stop_type == "unit") ? (Unit.find_by_id stop.stop_id)&.modal_unit : false

    i+=1
    counter += 1
  end

  json.tour_setting do

    json.last_message_id @chat_count

    json.locks_provider (@community.enable_locks and @community.locks_provider.present?) ? @community.locks_provider : ''
    if @community.enable_locks and @tour_user.tour_type != "virtual_tour"
      if @community.locks_provider == "EdgeState"
        json.starting_point_locked tour.edgestate_locks.present? ? true : false
      elsif @community.locks_provider == "Dwelo"
        json.starting_point_locked tour.dwelo_locks.present? ? true : false
      elsif  @community.locks_provider == "Latch"
        json.starting_point_locked tour.latch_locks.present? ? (@tour_user.latch_guests.find_by(community_id: @community.id, guest_of_stop_id: tour.latch_locks.first.stop_id, guest_of_stop_type: "Tour", status: "active").present?) : false
      else
        json.starting_point_locked false
      end
    else
      json.starting_point_locked false
    end
    
    json.authenticate_zerv is_zerv_lock_present
    json.is_igloohome_lock_present is_igloohome_lock_present
    json.is_latch_lock_present is_latch_lock_present
    json.is_edgestate_lock_present is_edgestate_lock_present
    json.is_dwello_lock_present is_dwello_lock_present

    json.tour_start_point_lock_type (@tour_user.tour_type != "virtual_tour" &&  @community.enable_locks)  ? @community.community_tour.lock_provider : ""

    json.current_position_marker_icon @community.community_tour.marker_icon_size.present? ? (@community.community_tour.marker_icon_size == "0" ? "19x25" : (@community.community_tour.marker_icon_size == "1" ? "17x23" : (@community.community_tour.marker_icon_size == "2" ? "15x21" : (@community.community_tour.marker_icon_size == "3" ? "13x19" : (@community.community_tour.marker_icon_size == "4" ? "11x17" : "19x25")  )) ) )  : "19x25"
    json.next_position_marker_icon  @community.community_tour.marker_icon_size.present? ? (@community.community_tour.marker_icon_size == "0" ? "35x35" : (@community.community_tour.marker_icon_size == "1" ? "33x33" : (@community.community_tour.marker_icon_size == "2" ? "31x31" : (@community.community_tour.marker_icon_size == "3" ? "29x29" : (@community.community_tour.marker_icon_size == "4" ? "27x27" : "35x35")  )) ) )  : "35x35"
    json.show_camera_button (@tour_user.tour_type != "virtual_tour") ? @community.show_camera_button : false
    json.dotted_line_color @community.community_tour.dotted_line_color rescue "green"
    json.visual_id_verification (@tour_user.tour_type != "virtual_tour") ? tour.visual_id_verification : false
    json.apply_now_self_tour @community.show_apply_now
    json.show_apply_now @community.show_apply_now
    json.chat_control (@community.chat_control and @community.is_chat_available) ? @community.chat_control : false
    json.enable_auto_zoom (@community.community_tour.present?) ? @community.community_tour.enable_auto_zoom : false
    json.show_map @community.show_map
    json.mdu @community.mdu
    json.display_rent @community.display_rent
    json.display_pricing_options @community.display_pricing_options
    json.pynwheel_access_username @community&.zerv&.username
    json.pynwheel_access_password @community&.zerv&.password
  end
end
