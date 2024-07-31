module ShortestPath
  # Important note for understaning
  # in this you will face some repeate code but with some differences its reason is, in pynwheel we have two types of communities 
  # First one is Sitmap and second is floorplate
  # But For Autowayfinding in floorplate community again we have two types, first is 1 building without building start/exit point and other is multiple buildings with building start/exit points
  # so totally we have three types communities. Most of the time this file reuse code but in some places you will think we need some optimization 
  # Actually I've added a space for some future improvements and one algo change/update will not affect oher algo so thats why complete optimazation is not achieved here.
  include DijkstraAlgo
  HAVING_DOOR_STOPS = ["Unit", "Amenity"]
  extend self
  def return_path_for_sitemap(community_id, path_type)
    fetch_related_data_for_sitemap(community_id)
    stops = {}
    algo_unit_data = get_unit_data(@hallways.dup, @unit_with_door.dup)
    algo_amenity_data = get_amenity_data(@hallways.dup, @amenity_with_doors.dup)
    start_point_data = get_starting_point_data(@hallways.dup)
    #algo_access_point_data = get_access_point_data()
    new_hallways_coordinates = fetch_hallways_coordinates_with_distance(@hallways.dup)
    hallways_id_to_uniq_id = make_hallways_id_to_uniq_id(new_hallways_coordinates, true)
    hallways_dijkstra_data = make_hallways_data_for_dijakstra(new_hallways_coordinates, hallways_id_to_uniq_id)
    starting_point = {}
    starting_point[hallways_id_to_uniq_id[start_point_data['hallway_id']]] = start_point_data['distance']
    stops[0] = starting_point
    stops.merge!(hallways_dijkstra_data).sort
    unit_starting_index = stops.keys.size
    unit_data = make_unit_data_according_to_door_id(algo_unit_data)
    unit_id_to_uniq_id = make_unit_id_to_uniq_id(unit_starting_index, unit_data)
    unit_dijkstra_data = make_unit_data_for_dijakstra(unit_data, unit_id_to_uniq_id, hallways_id_to_uniq_id, stops)
    stops.merge!(unit_dijkstra_data).sort
    amenity_starting_index = stops.keys.size
    amenity_data = make_amenity_data_according_to_door_id(algo_amenity_data)
    amenity_id_to_uniq_id = make_amenity_id_to_uniq_id(amenity_starting_index, amenity_data)
    amenity_dijkstra_data = make_amenity_data_for_dijakstra(amenity_data, amenity_id_to_uniq_id, hallways_id_to_uniq_id, stops)
    stops.merge!(amenity_dijkstra_data).sort
    #Data format which is required to dijkstra is complete here
    update_precedence_unit_arr(unit_id_to_uniq_id) # update precedense array for unit according to stops input ids
    update_precedence_amenity_arr(amenity_id_to_uniq_id) # update precedense array for amenity according to stops input ids
    precedence_visited_ids = []; @precedence_arr.each {|arr| precedence_visited_ids.push(arr[0]) }
    @gr = Graph.new
    add_nodes_edges_and_its_cost(stops)
    source = 0 ; destination_arr = precedence_visited_ids
    if path_type == "actual shortest"
      @gr.shortest_paths_without_sorting(source, destination_arr)
    elsif path_type == "sorting"
      @gr.shortest_paths_with_sorting(source, destination_arr) #shortest path with sorting
    end
    path_uniq_ids_arr = merge_path_two_d_arr_for_web(@gr.complete_path)
    path_object_in_order = fetch_path_object(path_uniq_ids_arr, hallways_id_to_uniq_id, unit_id_to_uniq_id, amenity_id_to_uniq_id, start_point_data, new_hallways_coordinates, unit_data, amenity_data, unit_starting_index, amenity_starting_index)
    return path_object_in_order
  end
  def return_path_for_floorplate(community_id, path_type)
    # initialize hashes to store data for making path
    path_object_in_order, complete_path, floors_graph, precedence_visited_ids_by_floor, algo_unit_data, algo_amenity_data, algo_elevator_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, starting_point = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    start_point_data, @stops, unit_starting_index, unit_data, amenity_data, unit_id_to_uniq_id, amenity_starting_index, amenity_id_to_uniq_id, elevator_starting_index, @elevator_data, elevator_id_to_uniq_id = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    fetch_related_data_for_floorplate(community_id)
    starting_floor = @floors_ids.first # For now starting point is always on first in future we will change it to any floor selected from db
    start_point_data = get_starting_point_data(@floorplate_hallways[@floor_to_floorplate_id[starting_floor]].dup)
    @floors_ids.each do |floor|
      algo_unit_data[floor] = @unit_with_door[floor].present? ? get_unit_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @unit_with_door[floor].dup) : []
      algo_amenity_data[floor] = @amenity_with_doors[floor].present? ? get_amenity_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @amenity_with_doors[floor].dup) : []
      algo_elevator_data[floor] = @floor_to_elevators[floor].present? ? get_elevator_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @floor_to_elevators[floor], floor) : []
      # access point functionality is on hold for now
      new_hallways_coordinates[floor] = fetch_hallways_coordinates_with_distance(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup)
      hallways_id_to_uniq_id[floor] = make_hallways_id_to_uniq_id(new_hallways_coordinates[floor].dup, (floor == starting_floor))
      hallways_dijkstra_data[floor] = make_hallways_data_for_dijakstra(new_hallways_coordinates[floor].dup, hallways_id_to_uniq_id[floor].dup)
      # Merge starting point
      if floor == starting_floor
        starting_point[hallways_id_to_uniq_id[floor][start_point_data['hallway_id']]] = start_point_data['distance']
        @stops[floor] = {0 => starting_point}
        @stops[floor] = @stops[floor].merge({hallways_id_to_uniq_id[floor][start_point_data['hallway_id']] => { 0 => start_point_data['distance']} })
      end
      # Merge Hallways
      @stops[floor] = @stops[floor].present? ? @stops[floor].deep_merge(hallways_dijkstra_data[floor]) : hallways_dijkstra_data[floor]
      # Merge Unit Data
      unit_starting_index[floor] = @stops[floor].keys.size
      unit_data[floor] = make_unit_data_according_to_door_id(algo_unit_data[floor])
      unit_id_to_uniq_id[floor] = make_unit_id_to_uniq_id(unit_starting_index[floor], unit_data[floor])
      unit_dijkstra_data = make_unit_data_for_dijakstra(unit_data[floor], unit_id_to_uniq_id[floor], hallways_id_to_uniq_id[floor], @stops[floor])
      @stops[floor].merge!(unit_dijkstra_data)
      # Merge Amenity Data
      amenity_starting_index[floor] = @stops[floor].keys.size
      amenity_data[floor] = make_amenity_data_according_to_door_id(algo_amenity_data[floor])
      amenity_id_to_uniq_id[floor] = make_amenity_id_to_uniq_id(amenity_starting_index[floor], amenity_data[floor])
      amenity_dijkstra_data = make_amenity_data_for_dijakstra(amenity_data[floor], amenity_id_to_uniq_id[floor], hallways_id_to_uniq_id[floor], @stops[floor])
      @stops[floor].merge!(amenity_dijkstra_data)
      # Merge Elevator Data
      elevator_starting_index[floor] = @stops[floor].keys.size
      @elevator_data[floor] = make_elevator_data_according_to_elevator_id(algo_elevator_data[floor])
      elevator_id_to_uniq_id[floor] = make_elevator_id_to_uniq_id(elevator_starting_index[floor], @elevator_data[floor])
      elevator_dijkstra_data = make_elevator_data_for_dijakstra(@elevator_data[floor], elevator_id_to_uniq_id[floor], hallways_id_to_uniq_id[floor], @stops[floor])
      @stops[floor].merge!(elevator_dijkstra_data)
      #Update @precedence_according_to_floors array like stops id key 
      update_precedence_unit_arr_for_floor(unit_id_to_uniq_id[floor], floor)
      update_precedence_amenity_arr_for_floor(amenity_id_to_uniq_id[floor], floor)
    end
    floor_to_elevator_uniq_ids = get_elevator_uniq_ids(elevator_id_to_uniq_id)
    uniq_id_to_elevator_by_floor = get_uniq_id_to_elevator(elevator_id_to_uniq_id)
    precedence_visited_ids_by_floor = get_floor_by_floor_precedence_of_unit_and_amnity()
    floors_graph = get_floor_by_floor_graph()
    # Find upside path form temp uniq ids floor by floor
    last_floor_id = fetch_last_floor(precedence_visited_ids_by_floor)
    @floors_ids = @floors_ids[0..@floors_ids.find_index(last_floor_id)]
    traverse_back_path, traverse_back_path_object_in_order = {}, {}
    if @floors_ids.size == 1
      source = 0; destination_arr = precedence_visited_ids_by_floor[starting_floor]
      if path_type == "actual shortest"
        floors_graph[starting_floor].shortest_paths_without_sorting(source, destination_arr)
      else
        floors_graph[starting_floor].shortest_paths_with_sorting(source, destination_arr)
      end
      complete_path[starting_floor] = floors_graph[starting_floor].complete_path
      src = floors_graph[starting_floor].source
      path_uniq_ids_arr = fetch_flattan_path_of_each_floor(complete_path, @floors_ids)
      path_object_in_order[starting_floor] = fetch_path_object_for_floor(path_uniq_ids_arr[starting_floor], hallways_id_to_uniq_id[starting_floor], unit_id_to_uniq_id[starting_floor], amenity_id_to_uniq_id[starting_floor], elevator_id_to_uniq_id[starting_floor], start_point_data, new_hallways_coordinates[starting_floor], unit_data[starting_floor], amenity_data[starting_floor], @elevator_data[starting_floor], unit_starting_index[starting_floor], amenity_starting_index[starting_floor], elevator_starting_index[starting_floor], starting_floor == starting_floor)
    else
      @floors_ids.each do |floor|
        if (floor == @floors_ids.first); source = 0; else; source = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor - 1][floors_graph[floor - 1].source]]; end
        destination_arr = precedence_visited_ids_by_floor[floor]
        unless (floor == last_floor_id)
          elevator_arr = elevators_which_have_next_floor(floor_to_elevator_uniq_ids[floor], uniq_id_to_elevator_by_floor[floor], floor)
        else
          elevator_arr = elevators_which_have_previous_floor(floor_to_elevator_uniq_ids[floor], uniq_id_to_elevator_by_floor[floor], floor)
        end
        if path_type == "actual shortest"
          #@gr.shortest_paths_without_sorting(source, destination_arr)
        elsif path_type == "sorting"
          floors_graph[floor].shortest_paths_with_sorting_in_floor(source, destination_arr, elevator_arr) #shortest path with sorting
          complete_path[floor] = floors_graph[floor].complete_path
        end
      end
      # fetch all elements from uniq ids to print
      path_uniq_ids_arr = fetch_flattan_path_of_each_floor(complete_path, @floors_ids)
      @floors_ids.each do |floor|
        path_object_in_order[floor] = fetch_path_object_for_floor(path_uniq_ids_arr[floor], hallways_id_to_uniq_id[floor], unit_id_to_uniq_id[floor], amenity_id_to_uniq_id[floor], elevator_id_to_uniq_id[floor], start_point_data, new_hallways_coordinates[floor], unit_data[floor], amenity_data[floor], @elevator_data[floor], unit_starting_index[floor], amenity_starting_index[floor], elevator_starting_index[floor], starting_floor == floor)
      end
      # traverse back to starting floor
      destination_floor_id = starting_floor # for now
      src = nil
      @floors_ids.reverse.each_with_index do |floor,indx|
        if floor == last_floor_id
          traverse_back_path[floor] = [floors_graph[last_floor_id].source]
          src = floors_graph[last_floor_id].source
        else
          if destination_floor_id == floor
            src = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor + 1][src]]
            traverse_back_path[floor] = [src]
          elsif have_elevator_on_current_floor(src, uniq_id_to_elevator_by_floor[floor + 1], floor + 1) && have_elevator_on_current_floor(src, uniq_id_to_elevator_by_floor[floor + 1], floor - 1) 
            src = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor + 1][src]]
            traverse_back_path[floor] = [src]
          else
            src = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor + 1][src]]
            elevator_arr = elevators_which_have_previous_floor(floor_to_elevator_uniq_ids[floor], uniq_id_to_elevator_by_floor[floor], floor)
            floors_graph[floor].traverse_back(src, elevator_arr)
            traverse_back_path[floor] = floors_graph[floor].elevator_path.flatten
            src = floors_graph[floor].source
          end
        end
      end
      @floors_ids.each do |floor|
        traverse_back_path_object_in_order[floor] = fetch_path_object_for_floor(traverse_back_path[floor], hallways_id_to_uniq_id[floor], unit_id_to_uniq_id[floor], amenity_id_to_uniq_id[floor], elevator_id_to_uniq_id[floor], start_point_data, new_hallways_coordinates[floor], unit_data[floor], amenity_data[floor], @elevator_data[floor], unit_starting_index[floor], amenity_starting_index[floor], elevator_starting_index[floor], false)
      end
    end
    # now move to starting point again
    floors_graph[starting_floor].traverse_back(src, [0])
    starting_floor_elevator_to_starting_point = floors_graph[starting_floor].elevator_path.flatten
    starting_floor_elevator_to_starting_point_object_in_order = fetch_path_object_for_floor(starting_floor_elevator_to_starting_point, hallways_id_to_uniq_id[starting_floor], unit_id_to_uniq_id[starting_floor], amenity_id_to_uniq_id[starting_floor], elevator_id_to_uniq_id[starting_floor], start_point_data, new_hallways_coordinates[starting_floor], unit_data[starting_floor], amenity_data[starting_floor], @elevator_data[starting_floor], unit_starting_index[starting_floor], amenity_starting_index[starting_floor], elevator_starting_index[starting_floor], true)
    total_path = path_object_in_order.to_a + traverse_back_path_object_in_order.to_a.reverse() + [[starting_floor, starting_floor_elevator_to_starting_point_object_in_order]]
    return total_path, @floors_ids
  end
  def return_floorplate_path_for_multiple_buildings(building_list, community_id, path_type)
    @building_list = building_list
    path_object_in_order, complete_path, floors_graph, precedence_visited_ids_by_floor, algo_unit_data, algo_amenity_data, algo_elevator_data, algo_building_starting_point_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, starting_point, building_start_id_to_uniq_id, building_dijkstra_data = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    start_point_data, @stops, unit_starting_index, unit_data, amenity_data, unit_id_to_uniq_id, amenity_starting_index, amenity_id_to_uniq_id, elevator_starting_index, @elevator_data, elevator_id_to_uniq_id, building_starting_index, building_starting_point_data = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    path_object_in_order, complete_path, elevator_id_to_uniq_id, @elevator_data, elevator_starting_index, amenity_id_to_uniq_id, amenity_data, amenity_starting_index, unit_id_to_uniq_id, unit_data, start_point_data, @stops, starting_point, algo_unit_data, algo_amenity_data, algo_elevator_data, algo_building_starting_point_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, building_starting_index, building_starting_point_data, building_start_id_to_uniq_id, building_dijkstra_data, unit_starting_index = initialize_stops_with_buildings(start_point_data, @stops, starting_point,algo_unit_data, algo_amenity_data, algo_elevator_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, algo_building_starting_point_data, building_starting_index, building_starting_point_data, building_start_id_to_uniq_id, building_dijkstra_data, unit_starting_index, unit_data, unit_id_to_uniq_id, amenity_starting_index, amenity_data, amenity_id_to_uniq_id, elevator_starting_index, @elevator_data, elevator_id_to_uniq_id, complete_path, path_object_in_order)
    fetch_floorplate_related_data_for_multiple_buildings(community_id, @building_list)
    starting_floor = @floors_ids.first # For now starting point is always on first in future we will change it to any floor selected from db
    starting_building = @building_list.first
    # Make uniq stops for path 
    @building_list.each do |building|
      start_point_data[building] = get_starting_point_data(@floorplate_hallways[@floor_to_floorplate_id[starting_floor]].dup)
      @floors_ids.each do |floor|
        algo_unit_data[building][floor] = @unit_with_door[building][floor].present? ? get_unit_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @unit_with_door[building][floor].dup) : []
        algo_amenity_data[building][floor] = @amenity_with_doors[building][floor].present? ? get_amenity_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @amenity_with_doors[building][floor].dup) : []
        algo_elevator_data[building][floor] = @building_to_floor_to_elevators[building][floor].present? ? get_elevator_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @building_to_floor_to_elevators[building][floor], floor) : []
        # access point functionality is on hold for now
        new_hallways_coordinates[building][floor] = fetch_hallways_coordinates_with_distance(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup)      
        hallways_id_to_uniq_id[building][floor] = make_hallways_id_to_uniq_id(new_hallways_coordinates[building][floor].dup, starting_point_for_building(building, floor))
        hallways_dijkstra_data[building][floor] = make_hallways_data_for_dijakstra(new_hallways_coordinates[building][floor].dup, hallways_id_to_uniq_id[building][floor].dup)
        # Merge starting point to first and last building of first floor
        if starting_point_for_building(building, floor)
          starting_point[building][hallways_id_to_uniq_id[building][floor][start_point_data[building]['hallway_id']]] = start_point_data[building]['distance']
          @stops[building][floor] = {0 => starting_point[building]}
          @stops[building][floor] = @stops[building][floor].merge({hallways_id_to_uniq_id[building][floor][start_point_data[building]['hallway_id']] => { 0 => start_point_data[building]['distance']} })
        end
        # Merge Hallways
        @stops[building][floor] = @stops[building][floor].present? ? @stops[building][floor].deep_merge(hallways_dijkstra_data[building][floor]) : hallways_dijkstra_data[building][floor]
        # Merge Building Starting/ Exit Point for first floor of every building
        if building_starting_point_for_building(building, floor)
          algo_building_starting_point_data[building][floor] = @building_starting_exit_points.present? ? get_building_starting_exit_point_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @building_starting_exit_points.dup) : []
          building_starting_index[building][floor] = @stops[building][floor].keys.size
          building_starting_point_data[building][floor] = make_building_starting_point_data_according_to_building_starting_point_id(algo_building_starting_point_data[building][floor].dup)
          building_start_id_to_uniq_id[building][floor] = make_building_start_id_to_uniq_id(building_starting_index[building][floor], building_starting_point_data[building][floor])
          building_dijkstra_data = make_building_start_data_for_dijakstra(building_starting_point_data[building][floor], building_start_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
          @stops[building][floor].merge!(building_dijkstra_data)
        end
        # Merge Unit Data
        unit_starting_index[building][floor] = @stops[building][floor].keys.size
        unit_data[building][floor] = make_unit_data_according_to_door_id(algo_unit_data[building][floor])
        unit_id_to_uniq_id[building][floor] = make_unit_id_to_uniq_id(unit_starting_index[building][floor], unit_data[building][floor])
        unit_dijkstra_data = make_unit_data_for_dijakstra(unit_data[building][floor], unit_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
        @stops[building][floor].merge!(unit_dijkstra_data)
        # Merge Amenity Data
        amenity_starting_index[building][floor] = @stops[building][floor].keys.size
        amenity_data[building][floor] = make_amenity_data_according_to_door_id(algo_amenity_data[building][floor])
        amenity_id_to_uniq_id[building][floor] = make_amenity_id_to_uniq_id(amenity_starting_index[building][floor], amenity_data[building][floor])
        amenity_dijkstra_data = make_amenity_data_for_dijakstra(amenity_data[building][floor], amenity_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
        @stops[building][floor].merge!(amenity_dijkstra_data)
        # Merge Elevator Data
        elevator_starting_index[building][floor] = @stops[building][floor].keys.size
        @elevator_data[building][floor] = make_elevator_data_according_to_elevator_id(algo_elevator_data[building][floor])
        elevator_id_to_uniq_id[building][floor] = make_elevator_id_to_uniq_id(elevator_starting_index[building][floor], @elevator_data[building][floor])
        elevator_dijkstra_data = make_elevator_data_for_dijakstra(@elevator_data[building][floor], elevator_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
        @stops[building][floor].merge!(elevator_dijkstra_data)
        # Update @precedence_according_to_building_to_floors array like stops id key 
        update_precedence_unit_arr_for_building(unit_id_to_uniq_id[building][floor], building, floor)
        update_precedence_amenity_arr_for_building(amenity_id_to_uniq_id[building][floor], building, floor)
      end
    end
    floor_to_elevator_uniq_ids = get_elevator_uniq_ids_for_building(elevator_id_to_uniq_id)
    uniq_id_to_elevator_by_floor = get_uniq_id_to_elevator_for_building(elevator_id_to_uniq_id)
    precedence_visited_ids_by_floor = get_buildings_floor_by_floor_precedence_of_unit_and_amnity()
    floors_graph = get_building_to_building_with_floors_graph()
    first_building_pass = true
    path_object_in_order.keys.each {|building| path_object_in_order[building] = {"upside_path_objects" => {}, "downside_path_objects" => {} } }
    @floors_ids_before = @floors_ids.deep_dup
    remove_buildings_which_have_no_any_stop_to_visit(precedence_visited_ids_by_floor)
    updated_floors_ids_and_collect_last_floor_id_against_each_building(precedence_visited_ids_by_floor)
    @building_list.each do |building|
      # Find upside path form temp uniq ids floor by floor
      @floors_ids[building].each do |floor|
        # first move towards starting point to building starting point
        if first_building_pass
          source = 0; destination_arr = [building_start_id_to_uniq_id[building][floor][@building_to_building_id[building]]]
          floors_graph[building][floor].from_one_point_to_move_other_point(source, destination_arr)
          complete_path[building][floor] = floors_graph[building][floor].one_to_one_path
        end
        if first_building_pass; source = floors_graph[building][floor].source; elsif floor == @floors_ids[building].first; source = building_start_id_to_uniq_id[building][floor][@building_to_building_id[building]]; else; source = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor - 1][floors_graph[building][floor - 1].source]]; end
        destination_arr = precedence_visited_ids_by_floor[building][floor]
        unless (floor == @last_floor_against_building[building])
          elevator_arr = elevators_which_have_next_floor_in_building(floor_to_elevator_uniq_ids[building][floor], uniq_id_to_elevator_by_floor[building][floor], building, floor)
        else
          elevator_arr = elevators_which_have_previous_floor_in_building(floor_to_elevator_uniq_ids[building][floor], uniq_id_to_elevator_by_floor[building][floor], building, floor)
        end
        if path_type == "actual shortest"
          #@gr.shortest_paths_without_sorting(source, destination_arr)
        elsif path_type == "sorting"
          floors_graph[building][floor].shortest_paths_with_sorting_in_floor(source, destination_arr, elevator_arr) #shortest path with sorting
          complete_path[building][floor] = complete_path[building].has_key?(floor) ? (complete_path[building][floor] + floors_graph[building][floor].complete_path) : floors_graph[building][floor].complete_path
        end
        first_building_pass = false
      end
      # fetch all elements from uniq ids to print
      path_uniq_ids_arr = fetch_flattan_path_of_each_floor(complete_path[building], @floors_ids[building]) 
      @floors_ids[building].each do |floor|
        if building_starting_point_for_building(building, floor)
          path_object_in_order[building]["upside_path_objects"][floor] = fetch_path_object_for_building(path_uniq_ids_arr[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor, building_starting_index[building][floor], building_starting_point_data[building][floor], building_start_id_to_uniq_id[building][floor])
        else
          path_object_in_order[building]["upside_path_objects"][floor] = fetch_path_object_for_building(path_uniq_ids_arr[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor)
        end
      end
      # traverse back to starting floor
      last_floor_id = @last_floor_against_building[building]
      destination_floor_id = starting_floor # for now
      traverse_back_path = {}
      src = nil
      @floors_ids[building].reverse.each_with_index do |floor,indx|
        if floor == last_floor_id
          traverse_back_path[floor] = [floors_graph[building][last_floor_id].source]
          src = floors_graph[building][last_floor_id].source
        else
          if destination_floor_id == floor
            src = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor + 1][src]]
            traverse_back_path[floor] = [src]
          elsif have_elevator_on_current_floor_for_building(src, uniq_id_to_elevator_by_floor[building][floor + 1], building, floor + 1) && have_elevator_on_current_floor_for_building(src, uniq_id_to_elevator_by_floor[building][floor + 1], building, floor - 1) 
            src = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor + 1][src]]
            traverse_back_path[floor] = [src]
          else
            src = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor + 1][src]]
            elevator_arr = elevators_which_have_previous_floor_in_building(floor_to_elevator_uniq_ids[building][floor], uniq_id_to_elevator_by_floor[building][floor], building, floor)
            floors_graph[building][floor].traverse_back(src, elevator_arr)
            traverse_back_path[floor] = floors_graph[building][floor].elevator_path.flatten
            src = floors_graph[building][floor].source
          end
        end
      end
      @floors_ids[building].each do |floor|
        if building_starting_point_for_building(building, floor)
          path_object_in_order[building]["downside_path_objects"][floor] = fetch_path_object_for_building(traverse_back_path[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor, building_starting_index[building][floor], building_starting_point_data[building][floor], building_start_id_to_uniq_id[building][floor] )
        else
          path_object_in_order[building]["downside_path_objects"][floor] = fetch_path_object_for_building(traverse_back_path[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor)
        end
      end
      if @building_list[@building_list.find_index(building) + 1].present? # yes we can move to next building starting point
        next_building = @building_list[@building_list.find_index(building) + 1]
        source = src; destination_arr = [building_start_id_to_uniq_id[building][destination_floor_id][@building_to_building_id[next_building]]]
        floors_graph[building][destination_floor_id].from_one_point_to_move_other_point(source, destination_arr)
        from_elevator_to_next_building_starting_point = floors_graph[building][destination_floor_id].one_to_one_path.flatten
        path_object_in_order[building]["downside_path_objects"][destination_floor_id] = fetch_path_object_for_building(from_elevator_to_next_building_starting_point, hallways_id_to_uniq_id[building][destination_floor_id], unit_id_to_uniq_id[building][destination_floor_id], amenity_id_to_uniq_id[building][destination_floor_id], elevator_id_to_uniq_id[building][destination_floor_id], start_point_data[building], new_hallways_coordinates[building][destination_floor_id], unit_data[building][destination_floor_id], amenity_data[building][destination_floor_id], @elevator_data[building][destination_floor_id], unit_starting_index[building][destination_floor_id], amenity_starting_index[building][destination_floor_id], elevator_starting_index[building][destination_floor_id], building, destination_floor_id, building_starting_index[building][destination_floor_id], building_starting_point_data[building][destination_floor_id], building_start_id_to_uniq_id[building][destination_floor_id])
        source = floors_graph[building][destination_floor_id].source
      else # then this one is last building
        source = src; destination_arr = [0]
        floors_graph[building][destination_floor_id].from_one_point_to_move_other_point(source, destination_arr)
        from_elevator_to_starting_point = floors_graph[building][destination_floor_id].one_to_one_path.flatten
        path_object_in_order[building]["downside_path_objects"][destination_floor_id] = fetch_path_object_for_building(from_elevator_to_starting_point, hallways_id_to_uniq_id[building][destination_floor_id], unit_id_to_uniq_id[building][destination_floor_id], amenity_id_to_uniq_id[building][destination_floor_id], elevator_id_to_uniq_id[building][destination_floor_id], start_point_data[building], new_hallways_coordinates[building][destination_floor_id], unit_data[building][destination_floor_id], amenity_data[building][destination_floor_id], @elevator_data[building][destination_floor_id], unit_starting_index[building][destination_floor_id], amenity_starting_index[building][destination_floor_id], elevator_starting_index[building][destination_floor_id], building, destination_floor_id, building_starting_index[building][destination_floor_id], building_starting_point_data[building][destination_floor_id], building_start_id_to_uniq_id[building][destination_floor_id])
        source = floors_graph[building][destination_floor_id].source
      end
    end # building loop end
    path_object_in_arr_order =  change_three_d_path_to_one_d_path(path_object_in_order)
    return path_object_in_arr_order, @floors_ids_before
  end
  def return_path_for_mobile(new_stops_arr, community_id, path_type)
    fetch_related_data_according_to_mobile(new_stops_arr, community_id)
    stops = {}
    algo_unit_data = get_unit_data(@hallways.dup, @unit_with_door.dup)
    algo_amenity_data = get_amenity_data(@hallways.dup, @amenity_with_doors.dup)
    start_point_data = get_starting_point_data(@hallways.dup)
    #algo_access_point_data = get_access_point_data()
    new_hallways_coordinates = fetch_hallways_coordinates_with_distance(@hallways.dup)
    hallways_id_to_uniq_id = make_hallways_id_to_uniq_id(new_hallways_coordinates, true)
    hallways_dijkstra_data = make_hallways_data_for_dijakstra(new_hallways_coordinates, hallways_id_to_uniq_id)
    starting_point = {}
    starting_point[hallways_id_to_uniq_id[start_point_data['hallway_id']]] = start_point_data['distance']
    hallways_id_to_uniq_id[start_point_data['hallway_id']]
    stops[0] = starting_point
    stops[hallways_id_to_uniq_id[start_point_data['hallway_id']]] = {0 => start_point_data['distance']}
    stops.deep_merge!(hallways_dijkstra_data).sort
    unit_starting_index = stops.keys.size
    unit_data = make_unit_data_according_to_door_id(algo_unit_data)
    unit_id_to_uniq_id = make_unit_id_to_uniq_id(unit_starting_index, unit_data)
    unit_dijkstra_data = make_unit_data_for_dijakstra(unit_data, unit_id_to_uniq_id, hallways_id_to_uniq_id, stops)
    stops.merge!(unit_dijkstra_data).sort
    amenity_starting_index = stops.keys.size
    amenity_data = make_amenity_data_according_to_door_id(algo_amenity_data)
    amenity_id_to_uniq_id = make_amenity_id_to_uniq_id(amenity_starting_index, amenity_data)
    amenity_dijkstra_data = make_amenity_data_for_dijakstra(amenity_data, amenity_id_to_uniq_id, hallways_id_to_uniq_id, stops)
    stops.merge!(amenity_dijkstra_data).sort
    update_precedence_unit_arr(unit_id_to_uniq_id)
    update_precedence_amenity_arr(amenity_id_to_uniq_id)
    precedence_visited_ids = []; @precedence_arr.each {|arr| precedence_visited_ids.push(arr[0]) }
    precedence_visited_ids.push(0)
    @gr = Graph.new
    add_nodes_edges_and_its_cost(stops)
    source = 0 ; destination_arr = precedence_visited_ids
    if path_type == "actual shortest"
      @gr.shortest_paths_without_sorting(source, destination_arr)
    elsif path_type == "sorting"
      @gr.shortest_paths_with_sorting(source, destination_arr) #shortest path with sorting
    end
    path_uniq_ids_arr = merge_path_two_d_arr_for_web(@gr.complete_path)
    path_object_in_order = fetch_path_object(path_uniq_ids_arr, hallways_id_to_uniq_id, unit_id_to_uniq_id, amenity_id_to_uniq_id, start_point_data, new_hallways_coordinates, unit_data, amenity_data, unit_starting_index, amenity_starting_index)
    mobile_path = fetch_paths_arr(path_object_in_order)
    mobile_path
  end
  def return_floorplate_path_for_mobile(new_stops_arr, community_id, path_type, tour_user)
    # initialize hashes to store data for making path
    path_object_in_order, complete_path, floors_graph, precedence_visited_ids_by_floor, algo_unit_data, algo_amenity_data, algo_elevator_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, starting_point = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    start_point_data, @stops, unit_starting_index, unit_data, amenity_data, unit_id_to_uniq_id, amenity_starting_index, amenity_id_to_uniq_id, elevator_starting_index, @elevator_data, elevator_id_to_uniq_id = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    fetch_related_data_according_to_mobile_for_floorplate(new_stops_arr, community_id, tour_user)
    starting_floor = @floors_ids.first # For now starting point is always on first in future we will change it to any floor selected from db
    start_point_data = get_starting_point_data(@floorplate_hallways[@floor_to_floorplate_id[starting_floor]].dup)
    @floors_ids.each do |floor|
      algo_unit_data[floor] = @unit_with_door[floor].present? ? get_unit_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @unit_with_door[floor].dup) : []
      algo_amenity_data[floor] = @amenity_with_doors[floor].present? ? get_amenity_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @amenity_with_doors[floor].dup) : []
      algo_elevator_data[floor] = @floor_to_elevators[floor].present? ? get_elevator_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @floor_to_elevators[floor], floor) : []
      # access point functionality is on hold for now
      new_hallways_coordinates[floor] = fetch_hallways_coordinates_with_distance(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup)
      hallways_id_to_uniq_id[floor] = make_hallways_id_to_uniq_id(new_hallways_coordinates[floor].dup, (floor == starting_floor))
      hallways_dijkstra_data[floor] = make_hallways_data_for_dijakstra(new_hallways_coordinates[floor].dup, hallways_id_to_uniq_id[floor].dup)
      # Merge starting point
      if floor == starting_floor
        starting_point[hallways_id_to_uniq_id[floor][start_point_data['hallway_id']]] = start_point_data['distance']
        @stops[floor] = {0 => starting_point}
        @stops[floor] = @stops[floor].merge({hallways_id_to_uniq_id[floor][start_point_data['hallway_id']] => { 0 => start_point_data['distance']} })
      end
      # Merge Hallways
      @stops[floor] = @stops[floor].present? ? @stops[floor].deep_merge(hallways_dijkstra_data[floor]) : hallways_dijkstra_data[floor]
      # Merge Unit Data
      unit_starting_index[floor] = @stops[floor].keys.size
      unit_data[floor] = make_unit_data_according_to_door_id(algo_unit_data[floor])
      unit_id_to_uniq_id[floor] = make_unit_id_to_uniq_id(unit_starting_index[floor], unit_data[floor])
      unit_dijkstra_data = make_unit_data_for_dijakstra(unit_data[floor], unit_id_to_uniq_id[floor], hallways_id_to_uniq_id[floor], @stops[floor])
      @stops[floor].merge!(unit_dijkstra_data)
      # Merge Amenity Data
      amenity_starting_index[floor] = @stops[floor].keys.size
      amenity_data[floor] = make_amenity_data_according_to_door_id(algo_amenity_data[floor])
      amenity_id_to_uniq_id[floor] = make_amenity_id_to_uniq_id(amenity_starting_index[floor], amenity_data[floor])
      amenity_dijkstra_data = make_amenity_data_for_dijakstra(amenity_data[floor], amenity_id_to_uniq_id[floor], hallways_id_to_uniq_id[floor], @stops[floor])
      @stops[floor].merge!(amenity_dijkstra_data)
      # Merge Elevator Data
      elevator_starting_index[floor] = @stops[floor].keys.size
      @elevator_data[floor] = make_elevator_data_according_to_elevator_id(algo_elevator_data[floor])
      elevator_id_to_uniq_id[floor] = make_elevator_id_to_uniq_id(elevator_starting_index[floor], @elevator_data[floor])
      elevator_dijkstra_data = make_elevator_data_for_dijakstra(@elevator_data[floor], elevator_id_to_uniq_id[floor], hallways_id_to_uniq_id[floor], @stops[floor])
      @stops[floor].merge!(elevator_dijkstra_data)
      #Update @precedence_according_to_floors array like stops id key 
      update_precedence_unit_arr_for_floor(unit_id_to_uniq_id[floor], floor)
      update_precedence_amenity_arr_for_floor(amenity_id_to_uniq_id[floor], floor)
    end
    floor_to_elevator_uniq_ids = get_elevator_uniq_ids(elevator_id_to_uniq_id)
    uniq_id_to_elevator_by_floor = get_uniq_id_to_elevator(elevator_id_to_uniq_id)
    precedence_visited_ids_by_floor = get_floor_by_floor_precedence_of_unit_and_amnity()
    floors_graph = get_floor_by_floor_graph()
    # Find path form temp uniq ids floor by floor
    last_floor_id = fetch_last_floor(precedence_visited_ids_by_floor)
    @floors_ids = @floors_ids[0..@floors_ids.find_index(last_floor_id)]
    traverse_back_path, traverse_back_path_object_in_order = {}, {}
    if @floors_ids.size == 1
      source = 0; destination_arr = precedence_visited_ids_by_floor[starting_floor]
      if path_type == "actual shortest"
        floors_graph[starting_floor].shortest_paths_without_sorting(source, destination_arr)
      else
        floors_graph[starting_floor].shortest_paths_with_sorting(source, destination_arr)
      end
      complete_path[starting_floor] = floors_graph[starting_floor].complete_path
      src = floors_graph[starting_floor].source
      path_uniq_ids_arr = fetch_flattan_path_of_each_floor(complete_path, @floors_ids)
      path_object_in_order[starting_floor] = fetch_path_object_for_floor(path_uniq_ids_arr[starting_floor], hallways_id_to_uniq_id[starting_floor], unit_id_to_uniq_id[starting_floor], amenity_id_to_uniq_id[starting_floor], elevator_id_to_uniq_id[starting_floor], start_point_data, new_hallways_coordinates[starting_floor], unit_data[starting_floor], amenity_data[starting_floor], @elevator_data[starting_floor], unit_starting_index[starting_floor], amenity_starting_index[starting_floor], elevator_starting_index[starting_floor], starting_floor == starting_floor)
    else
      @floors_ids.each do |floor|
        if (floor == @floors_ids.first); source = 0; else; source = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor - 1][floors_graph[floor - 1].source]]; end
        destination_arr = precedence_visited_ids_by_floor[floor]
        unless (floor == last_floor_id)
          elevator_arr = elevators_which_have_next_floor(floor_to_elevator_uniq_ids[floor], uniq_id_to_elevator_by_floor[floor], floor)
        else
          elevator_arr = elevators_which_have_previous_floor(floor_to_elevator_uniq_ids[floor], uniq_id_to_elevator_by_floor[floor], floor)
        end
        if path_type == "actual shortest"
          #@gr.shortest_paths_without_sorting(source, destination_arr)
        elsif path_type == "sorting"
          floors_graph[floor].shortest_paths_with_sorting_in_floor(source, destination_arr, elevator_arr) #shortest path with sorting
          complete_path[floor] = floors_graph[floor].complete_path
        end
      end
      # fetch all elements from uniq ids to print
      path_uniq_ids_arr = fetch_flattan_path_of_each_floor(complete_path, @floors_ids)
      @floors_ids.each do |floor|
        path_object_in_order[floor] = fetch_path_object_for_floor(path_uniq_ids_arr[floor], hallways_id_to_uniq_id[floor], unit_id_to_uniq_id[floor], amenity_id_to_uniq_id[floor], elevator_id_to_uniq_id[floor], start_point_data, new_hallways_coordinates[floor], unit_data[floor], amenity_data[floor], @elevator_data[floor], unit_starting_index[floor], amenity_starting_index[floor], elevator_starting_index[floor], starting_floor == floor)
      end
      # traverse back to starting floor
      destination_floor_id = starting_floor # for now
      src = nil
      @floors_ids.reverse.each_with_index do |floor,indx|
        if floor == last_floor_id
          traverse_back_path[floor] = [floors_graph[last_floor_id].source]
          src = floors_graph[last_floor_id].source
        else
          if destination_floor_id == floor
            src = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor + 1][src]]
            traverse_back_path[floor] = [src]
          elsif have_elevator_on_current_floor(src, uniq_id_to_elevator_by_floor[floor + 1], floor + 1) && have_elevator_on_current_floor(src, uniq_id_to_elevator_by_floor[floor + 1], floor - 1) 
            src = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor + 1][src]]
            traverse_back_path[floor] = [src]
          else
            src = elevator_id_to_uniq_id[floor][uniq_id_to_elevator_by_floor[floor + 1][src]]
            elevator_arr = elevators_which_have_previous_floor(floor_to_elevator_uniq_ids[floor], uniq_id_to_elevator_by_floor[floor], floor)
            floors_graph[floor].traverse_back(src, elevator_arr)
            traverse_back_path[floor] = floors_graph[floor].elevator_path.flatten
            src = floors_graph[floor].source
          end
        end
      end
      @floors_ids.each do |floor|
        traverse_back_path_object_in_order[floor] = fetch_path_object_for_floor(traverse_back_path[floor], hallways_id_to_uniq_id[floor], unit_id_to_uniq_id[floor], amenity_id_to_uniq_id[floor], elevator_id_to_uniq_id[floor], start_point_data, new_hallways_coordinates[floor], unit_data[floor], amenity_data[floor], @elevator_data[floor], unit_starting_index[floor], amenity_starting_index[floor], elevator_starting_index[floor], false)
      end
    end
    # now move to starting point again
    floors_graph[starting_floor].traverse_back(src, [0])
    starting_floor_elevator_to_starting_point = floors_graph[starting_floor].elevator_path.flatten
    starting_floor_elevator_to_starting_point_object_in_order = fetch_path_object_for_floor(starting_floor_elevator_to_starting_point, hallways_id_to_uniq_id[starting_floor], unit_id_to_uniq_id[starting_floor], amenity_id_to_uniq_id[starting_floor], elevator_id_to_uniq_id[starting_floor], start_point_data, new_hallways_coordinates[starting_floor], unit_data[starting_floor], amenity_data[starting_floor], @elevator_data[starting_floor], unit_starting_index[starting_floor], amenity_starting_index[starting_floor], elevator_starting_index[starting_floor], true)
    total_path = {upstair_path: path_object_in_order, downstair_path: traverse_back_path_object_in_order, moving_to_starting_point: starting_floor_elevator_to_starting_point_object_in_order, floors: @floors_ids}
    mobile_path, upstair_elevator_hash, downstair_elevator_hash = fetch_paths_arr_for_floorplate(path_object_in_order, traverse_back_path_object_in_order, starting_floor_elevator_to_starting_point_object_in_order)
    new_stops_arr = update_new_stops_arr(new_stops_arr, upstair_elevator_hash, downstair_elevator_hash)
    return mobile_path, new_stops_arr
  end
  def return_floorplate_mobile_path_for_multiple_buildings(new_stops_arr, building_list, community_id, path_type, tour_user)
    @building_list = building_list
    path_object_in_order, complete_path, floors_graph, precedence_visited_ids_by_floor, algo_unit_data, algo_amenity_data, algo_elevator_data, algo_building_starting_point_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, starting_point, building_start_id_to_uniq_id, building_dijkstra_data = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    start_point_data, @stops, unit_starting_index, unit_data, amenity_data, unit_id_to_uniq_id, amenity_starting_index, amenity_id_to_uniq_id, elevator_starting_index, @elevator_data, elevator_id_to_uniq_id, building_starting_index, building_starting_point_data = {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    path_object_in_order, complete_path, elevator_id_to_uniq_id, @elevator_data, elevator_starting_index, amenity_id_to_uniq_id, amenity_data, amenity_starting_index, unit_id_to_uniq_id, unit_data, start_point_data, @stops, starting_point, algo_unit_data, algo_amenity_data, algo_elevator_data, algo_building_starting_point_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, building_starting_index, building_starting_point_data, building_start_id_to_uniq_id, building_dijkstra_data, unit_starting_index = initialize_stops_with_buildings(start_point_data, @stops, starting_point,algo_unit_data, algo_amenity_data, algo_elevator_data, new_hallways_coordinates, hallways_id_to_uniq_id, hallways_dijkstra_data, algo_building_starting_point_data, building_starting_index, building_starting_point_data, building_start_id_to_uniq_id, building_dijkstra_data, unit_starting_index, unit_data, unit_id_to_uniq_id, amenity_starting_index, amenity_data, amenity_id_to_uniq_id, elevator_starting_index, @elevator_data, elevator_id_to_uniq_id, complete_path, path_object_in_order)
    fetch_floorplate_mobile_related_data_for_multiple_buildings(new_stops_arr, community_id, @building_list, tour_user)
    starting_floor = @floors_ids.first # For now starting point is always on first in future we will change it to any floor selected from db
    starting_building = @building_list.first
    # Make uniq stops for path 
    @building_list.each do |building|
      start_point_data[building] = get_starting_point_data(@floorplate_hallways[@floor_to_floorplate_id[starting_floor]].dup)
      @floors_ids.each do |floor|
        algo_unit_data[building][floor] = @unit_with_door[building][floor].present? ? get_unit_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @unit_with_door[building][floor].dup) : []
        algo_amenity_data[building][floor] = @amenity_with_doors[building][floor].present? ? get_amenity_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @amenity_with_doors[building][floor].dup) : []
        algo_elevator_data[building][floor] = @building_to_floor_to_elevators[building][floor].present? ? get_elevator_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @building_to_floor_to_elevators[building][floor], floor) : []
        # access point functionality is on hold for now
        new_hallways_coordinates[building][floor] = fetch_hallways_coordinates_with_distance(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup)      
        hallways_id_to_uniq_id[building][floor] = make_hallways_id_to_uniq_id(new_hallways_coordinates[building][floor].dup, starting_point_for_building(building, floor))
        hallways_dijkstra_data[building][floor] = make_hallways_data_for_dijakstra(new_hallways_coordinates[building][floor].dup, hallways_id_to_uniq_id[building][floor].dup)
        # Merge starting point to first and last building of first floor
        if starting_point_for_building(building, floor)
          starting_point[building][hallways_id_to_uniq_id[building][floor][start_point_data[building]['hallway_id']]] = start_point_data[building]['distance']
          @stops[building][floor] = {0 => starting_point[building]}
          @stops[building][floor] = @stops[building][floor].merge({hallways_id_to_uniq_id[building][floor][start_point_data[building]['hallway_id']] => { 0 => start_point_data[building]['distance']} })
        end
        # Merge Hallways
        @stops[building][floor] = @stops[building][floor].present? ? @stops[building][floor].deep_merge(hallways_dijkstra_data[building][floor]) : hallways_dijkstra_data[building][floor]
        # Merge Building Starting/ Exit Point for first floor of every building
        if building_starting_point_for_building(building, floor)
          algo_building_starting_point_data[building][floor] = @building_starting_exit_points.present? ? get_building_starting_exit_point_data(@floorplate_hallways[@floor_to_floorplate_id[floor]].dup, @building_starting_exit_points.dup) : []
          building_starting_index[building][floor] = @stops[building][floor].keys.size
          building_starting_point_data[building][floor] = make_building_starting_point_data_according_to_building_starting_point_id(algo_building_starting_point_data[building][floor].dup)
          building_start_id_to_uniq_id[building][floor] = make_building_start_id_to_uniq_id(building_starting_index[building][floor], building_starting_point_data[building][floor])
          building_dijkstra_data = make_building_start_data_for_dijakstra(building_starting_point_data[building][floor], building_start_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
          @stops[building][floor].merge!(building_dijkstra_data)
        end
        # Merge Unit Data
        unit_starting_index[building][floor] = @stops[building][floor].keys.size
        unit_data[building][floor] = make_unit_data_according_to_door_id(algo_unit_data[building][floor])
        unit_id_to_uniq_id[building][floor] = make_unit_id_to_uniq_id(unit_starting_index[building][floor], unit_data[building][floor])
        unit_dijkstra_data = make_unit_data_for_dijakstra(unit_data[building][floor], unit_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
        @stops[building][floor].merge!(unit_dijkstra_data)
        # Merge Amenity Data
        amenity_starting_index[building][floor] = @stops[building][floor].keys.size
        amenity_data[building][floor] = make_amenity_data_according_to_door_id(algo_amenity_data[building][floor])
        amenity_id_to_uniq_id[building][floor] = make_amenity_id_to_uniq_id(amenity_starting_index[building][floor], amenity_data[building][floor])
        amenity_dijkstra_data = make_amenity_data_for_dijakstra(amenity_data[building][floor], amenity_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
        @stops[building][floor].merge!(amenity_dijkstra_data)
        # Merge Elevator Data
        elevator_starting_index[building][floor] = @stops[building][floor].keys.size
        @elevator_data[building][floor] = make_elevator_data_according_to_elevator_id(algo_elevator_data[building][floor])
        elevator_id_to_uniq_id[building][floor] = make_elevator_id_to_uniq_id(elevator_starting_index[building][floor], @elevator_data[building][floor])
        elevator_dijkstra_data = make_elevator_data_for_dijakstra(@elevator_data[building][floor], elevator_id_to_uniq_id[building][floor], hallways_id_to_uniq_id[building][floor], @stops[building][floor])
        @stops[building][floor].merge!(elevator_dijkstra_data)
        # Update @precedence_according_to_building_to_floors array like stops id key 
        update_precedence_unit_arr_for_building(unit_id_to_uniq_id[building][floor], building, floor)
        update_precedence_amenity_arr_for_building(amenity_id_to_uniq_id[building][floor], building, floor)
      end
    end
    floor_to_elevator_uniq_ids = get_elevator_uniq_ids_for_building(elevator_id_to_uniq_id)
    uniq_id_to_elevator_by_floor = get_uniq_id_to_elevator_for_building(elevator_id_to_uniq_id)
    precedence_visited_ids_by_floor = get_buildings_floor_by_floor_precedence_of_unit_and_amnity()
    floors_graph = get_building_to_building_with_floors_graph()
    first_building_pass = true
    path_object_in_order.keys.each {|building| path_object_in_order[building] = {"upside_path_objects" => {}, "downside_path_objects" => {} } }
    @floors_ids_before = @floors_ids.deep_dup
    remove_buildings_which_have_no_any_stop_to_visit(precedence_visited_ids_by_floor)
    updated_floors_ids_and_collect_last_floor_id_against_each_building(precedence_visited_ids_by_floor)

    @building_list.each do |building|
      # Find upside path form temp uniq ids floor by floor
      @floors_ids[building].each do |floor|
        # first move towards starting point to building starting points

        if first_building_pass
          source = 0; destination_arr = [building_start_id_to_uniq_id[building][floor][@building_to_building_id[building]]]
          floors_graph[building][floor].from_one_point_to_move_other_point(source, destination_arr)
          complete_path[building][floor] = floors_graph[building][floor].one_to_one_path
        end
        
        if first_building_pass 
          source = floors_graph[building][floor].source 
        elsif floor == @floors_ids[building].first 
          source = building_start_id_to_uniq_id[building][floor][@building_to_building_id[building]] 
        else 
          if elevator_id_to_uniq_id[building][floor].present?
            source = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor - 1][floors_graph[building][floor - 1].source]]
          else
            source = 0
          end
        end
        
        destination_arr = precedence_visited_ids_by_floor[building][floor]
        unless (floor == @last_floor_against_building[building])
          elevator_arr = elevators_which_have_next_floor_in_building(floor_to_elevator_uniq_ids[building][floor], uniq_id_to_elevator_by_floor[building][floor], building, floor)
        else
          elevator_arr = elevators_which_have_previous_floor_in_building(floor_to_elevator_uniq_ids[building][floor], uniq_id_to_elevator_by_floor[building][floor], building, floor)
        end
        if path_type == "actual shortest"
          #@gr.shortest_paths_without_sorting(source, destination_arr)
        elsif path_type == "sorting"
          floors_graph[building][floor].shortest_paths_with_sorting_in_floor(source, destination_arr, elevator_arr) #shortest path with sorting
          complete_path[building][floor] = complete_path[building].has_key?(floor) ? (complete_path[building][floor] + floors_graph[building][floor].complete_path) : floors_graph[building][floor].complete_path
        end
        first_building_pass = false
      end
      # fetch all elements from uniq ids to print
      path_uniq_ids_arr = fetch_flattan_path_of_each_floor(complete_path[building], @floors_ids[building]) 
      @floors_ids[building].each do |floor|
        if building_starting_point_for_building(building, floor)
          path_object_in_order[building]["upside_path_objects"][floor] = fetch_path_object_for_building(path_uniq_ids_arr[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor, building_starting_index[building][floor], building_starting_point_data[building][floor], building_start_id_to_uniq_id[building][floor])
        else
          path_object_in_order[building]["upside_path_objects"][floor] = fetch_path_object_for_building(path_uniq_ids_arr[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor)
        end
      end
      # traverse back to starting floor
      last_floor_id = @last_floor_against_building[building]
      destination_floor_id = starting_floor # for now
      traverse_back_path = {}
      src = nil
      @floors_ids[building].reverse.each_with_index do |floor,indx|
        if floor == last_floor_id
          traverse_back_path[floor] = [floors_graph[building][last_floor_id].source]
          src = floors_graph[building][last_floor_id].source
        else
          if destination_floor_id == floor
            src = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor + 1][src]] if  elevator_id_to_uniq_id[building][floor].present?
            traverse_back_path[floor] = [src]
          elsif have_elevator_on_current_floor_for_building(src, uniq_id_to_elevator_by_floor[building][floor + 1], building, floor + 1) && have_elevator_on_current_floor_for_building(src, uniq_id_to_elevator_by_floor[building][floor + 1], building, floor - 1) 
            src = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor + 1][src]]
            traverse_back_path[floor] = [src]
          else
            src = elevator_id_to_uniq_id[building][floor][uniq_id_to_elevator_by_floor[building][floor + 1][src]] if elevator_id_to_uniq_id[building][floor].present?
            elevator_arr = elevators_which_have_previous_floor_in_building(floor_to_elevator_uniq_ids[building][floor], uniq_id_to_elevator_by_floor[building][floor], building, floor)
            floors_graph[building][floor].traverse_back(src, elevator_arr)
            traverse_back_path[floor] = floors_graph[building][floor].elevator_path.flatten
            src = floors_graph[building][floor].source
          end
        end
      end
      @floors_ids[building].each do |floor|
        if building_starting_point_for_building(building, floor)
          path_object_in_order[building]["downside_path_objects"][floor] = fetch_path_object_for_building(traverse_back_path[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor, building_starting_index[building][floor], building_starting_point_data[building][floor], building_start_id_to_uniq_id[building][floor] )
        else
          path_object_in_order[building]["downside_path_objects"][floor] = fetch_path_object_for_building(traverse_back_path[floor], hallways_id_to_uniq_id[building][floor], unit_id_to_uniq_id[building][floor], amenity_id_to_uniq_id[building][floor], elevator_id_to_uniq_id[building][floor], start_point_data[building], new_hallways_coordinates[building][floor], unit_data[building][floor], amenity_data[building][floor], @elevator_data[building][floor], unit_starting_index[building][floor], amenity_starting_index[building][floor], elevator_starting_index[building][floor], building, floor)
        end
      end
      if @building_list[@building_list.find_index(building) + 1].present? # yes we can move to next building starting point
        next_building = @building_list[@building_list.find_index(building) + 1]
        source = src; destination_arr = [building_start_id_to_uniq_id[building][destination_floor_id][@building_to_building_id[next_building]]]
        floors_graph[building][destination_floor_id].from_one_point_to_move_other_point(source, destination_arr)
        from_elevator_to_next_building_starting_point = floors_graph[building][destination_floor_id].one_to_one_path.flatten
        path_object_in_order[building]["downside_path_objects"][destination_floor_id] = fetch_path_object_for_building(from_elevator_to_next_building_starting_point, hallways_id_to_uniq_id[building][destination_floor_id], unit_id_to_uniq_id[building][destination_floor_id], amenity_id_to_uniq_id[building][destination_floor_id], elevator_id_to_uniq_id[building][destination_floor_id], start_point_data[building], new_hallways_coordinates[building][destination_floor_id], unit_data[building][destination_floor_id], amenity_data[building][destination_floor_id], @elevator_data[building][destination_floor_id], unit_starting_index[building][destination_floor_id], amenity_starting_index[building][destination_floor_id], elevator_starting_index[building][destination_floor_id], building, destination_floor_id, building_starting_index[building][destination_floor_id], building_starting_point_data[building][destination_floor_id], building_start_id_to_uniq_id[building][destination_floor_id])
        source = floors_graph[building][destination_floor_id].source
      else # then this one is last building
        source = src; destination_arr = [0]
        floors_graph[building][destination_floor_id].from_one_point_to_move_other_point(source, destination_arr)
        from_elevator_to_starting_point = floors_graph[building][destination_floor_id].one_to_one_path.flatten
        path_object_in_order[building]["downside_path_objects"][destination_floor_id] = fetch_path_object_for_building(from_elevator_to_starting_point, hallways_id_to_uniq_id[building][destination_floor_id], unit_id_to_uniq_id[building][destination_floor_id], amenity_id_to_uniq_id[building][destination_floor_id], elevator_id_to_uniq_id[building][destination_floor_id], start_point_data[building], new_hallways_coordinates[building][destination_floor_id], unit_data[building][destination_floor_id], amenity_data[building][destination_floor_id], @elevator_data[building][destination_floor_id], unit_starting_index[building][destination_floor_id], amenity_starting_index[building][destination_floor_id], elevator_starting_index[building][destination_floor_id], building, destination_floor_id, building_starting_index[building][destination_floor_id], building_starting_point_data[building][destination_floor_id], building_start_id_to_uniq_id[building][destination_floor_id])
        source = floors_graph[building][destination_floor_id].source
      end
    end # building loop end
    mobile_path = fetch_paths_arr_for_floorplate_multiple_buildings(path_object_in_order)
    new_stops_arr = update_new_stops_arr_for_multiple_buildings(new_stops_arr)
    return mobile_path, new_stops_arr
  end
  def return_path_points_to_mobile(mobile_path, source_type, dest_type, source_id, dest_id)
    path_points = []
    mobile_path.each do |path|
      if (path[0] == source_type && path[1] == dest_type && path[2] == source_id && path[3] == dest_id)
        path_points = path[4]
        break
      end
    end
    path_points
  end
  def return_next_floor_to_mobile(mobile_path, source_type, dest_type, source_id, dest_id)
    floor_index = 7
    floor = ""
    mobile_path.each_with_index do |path, indx|
      if (path[0] == source_type && path[1] == dest_type && path[2] == source_id && path[3] == dest_id)
        if mobile_path[indx + 1].present?
          floor = mobile_path[indx + 1][floor_index]
        end
        break
      end
    end
    floor
  end
  def check_stops_have_multiple_buildings(new_stops_arr, community, tour_user)
    tour = tour_user.present? ? CustomizeTourService.new(community, tour_user).get_user_tour : community.community_tour
    sorted_building = tour.building_order.reject { |e| e.to_s.strip.empty? } rescue []
    tour_stops = tour&.tour_stops.plotted_stops.visible.order('sort ASC')
    unit_ids = tour_stops.where(stop_type: "unit").pluck(:stop_id)
    amenity_ids = tour_stops.where(stop_type: "amenity").pluck(:stop_id)
    building_list, actual_building_list = []
    actual_building_list = (Unit.where(community_id: community.id).pluck(:building)).reject { |e| e.to_s.strip.empty? } rescue []
    actual_building_list += Amenity.where(community_id: community.id).pluck(:building).reject { |e| e.to_s.strip.empty? }
    is_multiple_building = actual_building_list.uniq.count > 1
    building_list = (Unit.where(id: unit_ids).pluck(:building)).reject { |e| e.to_s.strip.empty? } rescue []
    building_list += Amenity.where(id: amenity_ids).pluck(:building).reject { |e| e.to_s.strip.empty? }
    building_list = building_list.compact.reject { |c| c.empty? }.uniq
    building_list = building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(building_list).sort.map{|x,y| y}
    
    if sorted_building.present?
      if (building_list - sorted_building != [] )
        building_list = (sorted_building) + (building_list - sorted_building) 
      elsif sorted_building - building_list != []
        building_list = (sorted_building & building_list)
      else
        building_list = sorted_building
      end
    end
    
    return is_multiple_building, building_list
  end

  def fetch_multiple_stops(stop_types, new_stops_arr, community_id, tour_user)
    community = Community.find community_id
    tour = tour_user.present? ? CustomizeTourService.new(community, tour_user).get_user_tour : community.community_tour
    tour_stops = tour&.tour_stops.plotted_stops.visible.order('sort ASC')
    floorplate_mobile_stops = []

    tour_stops.each do |tour_stop|
      floorplate_mobile_stops << tour_stop if stop_types.include?(tour_stop.stop_type) || new_stops_arr.include?(tour_stop)
    end

    floorplate_mobile_stops.compact
  end

  def fetch_tour_stops_which_are_required_from_mobile_side(new_stops_arr, community_id, tour_user = nil)
    fetch_multiple_stops(['elevator'], new_stops_arr, community_id, tour_user)
  end

  def fetch_tour_stops_which_are_required_from_mobile_side_for_multiple(new_stops_arr, community_id, tour_user = nil)
    fetch_multiple_stops(['elevator', 'building_starting_point'], new_stops_arr, community_id, tour_user)
  end

  def return_stop_lock(stop)
    lock = nil
    if HAVING_DOOR_STOPS.include?(stop.class.name)
      if stop.class.name == "Unit"
        lock = stop.door.present? ? return_lock(stop.door) : return_lock(stop)
      elsif stop.class.name == "Amenity"
        lock = stop.doors.present? ? return_lock(amenity_door(stop)) : return_lock(stop)
      else
        lock = return_lock(stop)
      end
    else
      lock = return_lock(stop) 
    end
    lock
  end
  private
    def return_lock(stop_or_door)
      lock = nil
      if digital_lock_provider?(stop_or_door)
        if stop_or_door.class.name == "Door"
          lock = stop_or_door.public_send(stop_or_door.lock_provider.downcase + "_lock")
        else
          lock = stop_or_door.public_send(stop_or_door.lock_provider.downcase + "_locks").first
        end
      end
      lock
    end
    def digital_lock_provider?(stop)
      stop.lock_provider.present? and stop.lock_provider != "" and stop.lock_provider != "Manual"
    end
    def update_precedence(stop_type, stop_id, door_id)
      @precedence_arr.each_with_index do |arr,index|
        if arr[1] == stop_type && arr[0] == stop_id
          @precedence_arr[index] = [door_id, stop_type]
          @stops_id_hash[@stops_id_hash.keys()[@stops_id_hash.values().find_index(stop_id)]] = door_id
          break
        end
      end
    end
    def update_precedence_for_floors(floor, stop_type, stop_id, door_id)
      @precedence_according_to_floors[floor].each_with_index do |arr,index|
        if arr[1] == stop_type && arr[0] == stop_id
          @precedence_according_to_floors[floor][index] = [door_id, stop_type]
          @stops_id_hash[@stops_id_hash.keys()[@stops_id_hash.values().find_index(stop_id)]] = door_id
          break
        end
      end
    end
    def update_precedence_for_building(building, floor, stop_type, stop_id, door_id)
      @precedence_according_to_building_to_floors[building][floor].each_with_index do |arr,index|
        if arr[1] == stop_type && arr[0] == stop_id
          @precedence_according_to_building_to_floors[building][floor][index] = [door_id, stop_type]
          @stops_id_hash[@stops_id_hash.keys()[@stops_id_hash.values().find_index(stop_id)]] = door_id
          break
        end
      end
    end
    def fetch_related_data_for_sitemap(community_id)
      @stops_id_hash = {}
      @community = Community.find community_id
      tour = @community.community_tour
      tour_stops = tour&.tour_stops.plotted_stops.visible.order('sort ASC')
      tour_stops.each {|tour_stop| @stops_id_hash[tour_stop.id] = tour_stop.stop_id}
      @precedence_arr = tour_stops.pluck(:stop_id, :stop_type) # due to sortable gem its sorted so we fetch in a line 
      @planned_to_visit_units_and_doors_ids     = []
      @planned_to_visit_amenities_and_doors_ids = []
      @sitemap = @community.sitemap
      @hallways = @sitemap.hallways.order("id ASC")
      @access_points = @sitemap.access_points
      planned_to_visit_units_ids     = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity",display_stop: true).pluck(:stop_id) rescue []
      @community_units = @community.units.are_ploted_units.where(floorplate_id: nil).order(:building, :unit_type).includes(:door) # only plotted units
      @unit_with_door = @community_units.map do |unit| 
        if planned_to_visit_units_ids.include?(unit.id)
          if unit.door.present?
            planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
            @planned_to_visit_units_and_doors_ids << unit.door.id
            update_precedence('unit', unit.id, unit.door.id)
          else
            @planned_to_visit_units_and_doors_ids << unit.id
          end 
          { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
        end
      end 
      @unit_with_door.compact!
      @amenities_doors = @sitemap.amenities.includes(:doors)
      @amenity_with_doors = @amenities_doors.map do |amenity| 
        if planned_to_visit_amenities_ids.include?(amenity.id)
          if amenity.doors.present?
            planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
            @planned_to_visit_amenities_and_doors_ids << amenity_door(amenity).id # currenly connected with one of multiple door
            update_precedence('amenity', amenity.id, amenity_door(amenity).id)
          else
            @planned_to_visit_amenities_and_doors_ids << amenity.id
          end
          { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } 
        end
      end
      @amenity_with_doors.compact!
      @starting_point = {x_plot: @community.community_tour.x_plot, y_plot: @community.community_tour.y_plot }
    end

    def fetch_related_data_according_to_mobile(new_stops_arr, community_id)
      @planned_to_visit_units_and_doors_ids     = []
      @planned_to_visit_amenities_and_doors_ids = []
      @community = Community.find community_id
      if @community.is_sitemap
        tour_stops_ids = new_stops_arr[1..(new_stops_arr.length - 2)].pluck(:id)
        tour_stops = TourStop.where(id: tour_stops_ids).order(:sort)
        @stops_id_hash = {}
        @precedence_arr = tour_stops.pluck(:stop_id, :stop_type)
        tour_stops.each {|tour_stop| @stops_id_hash[tour_stop.id] = tour_stop.stop_id}
        @sitemap = @community.sitemap
        @hallways = @sitemap.hallways.order("id ASC")
        @access_points = @sitemap.access_points
        planned_to_visit_units_ids     = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
        planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity",display_stop: true).pluck(:stop_id) rescue []
        @community_units = @community.units.are_ploted_units.where(floorplate_id: nil).order(:building, :unit_type).includes(:door) # only plotted units
        @unit_with_door = @community_units.map do |unit| 
          if planned_to_visit_units_ids.include?(unit.id) 
            if unit.door.present?
              planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
              @planned_to_visit_units_and_doors_ids << unit.door.id
              update_precedence('unit', unit.id, unit.door.id)
            else planned_to_visit_units_ids.include?(unit.id)
              @planned_to_visit_units_and_doors_ids << unit.id
            end 
            { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
          end 
        end
        @unit_with_door.compact!
        @amenities_doors = @sitemap.amenities.includes(:doors)
        @amenity_with_doors = @amenities_doors.map do |amenity| 
          if planned_to_visit_amenities_ids.include?(amenity.id)
            if amenity.doors.present?
              planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
              @planned_to_visit_amenities_and_doors_ids << amenity_door(amenity).id # currenly connected with one of multiple door
              update_precedence('amenity', amenity.id, amenity_door(amenity).id)
            else
              @planned_to_visit_amenities_and_doors_ids << amenity.id
            end
            { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } 
          end
        end
        @amenity_with_doors.compact!
        @starting_point = {x_plot: @community.community_tour.x_plot, y_plot: @community.community_tour.y_plot }
      else

      end
    end
    def fetch_related_data_according_to_mobile_for_floorplate(new_stops_arr, community_id, tour_user)
      @stops_id_hash, @floor_lists_hash, @floorplate_hallways, @floorplate_access_points, @floor_to_floorplate_id, floor_to_elevators = {}, {}, {}, {}, {}, {}
      @community = Community.find community_id
      tour = @community.community_tour
      # like stops input data hash connect with each floor 1 => stops, 2 => stops  
      tour_stops_ids = new_stops_arr.pluck(:id)
      tour_stops = TourStop.where(id: tour_stops_ids)
      tour_stops.each {|tour_stop| @stops_id_hash[tour_stop.id] = tour_stop.stop_id}
      @planned_to_visit_units_and_doors_ids, @planned_to_visit_amenities_and_doors_ids, @floors_specific_units, @floors_specific_amenities = [], [], {}, {}
      @floorplates = @community.floorplates
      @community.floorplates.map { |x| @floor_lists_hash[x.id] = x.floors }
      @floors_ids = @community.floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floor_to_floorplate_id = fetch_hash_for_floor_to_floorplate_id()
      @floorplates.each {|floorplate| @floorplate_hallways[floorplate.id] = floorplate.hallways.order("id ASC") }
      #@floorplates.each {|floorplate| @floorplate_access_points[floorplate.id] = floorplate.access_points } # For future use
      planned_to_visit_units_ids  = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity", display_stop: true).pluck(:stop_id) rescue []
      elevators_ids = tour_stops.where(stop_type: "elevator", display_stop: true).pluck(:stop_id) rescue []
      @floor_to_elevators = Elevator.fetch_elevator_according_to_floor(@floors_ids, elevators_ids)
      # @floor_to_elevators = UpdateTourStopsSortingOrder.new(@community, tour_user).nearest_elevator(tour_stops)
      @floors_specific_units = fetch_units_according_to_floor(planned_to_visit_units_ids)
      @floors_specific_amenities = fetch_amenities_according_to_floor(planned_to_visit_amenities_ids)
      @original_presendece_arr = fetch_unit_and_amenity_in_floor_by_floor_sorted_way(tour_stops, @floors_specific_units, @floors_specific_amenities, @floors_ids)
      @precedence_according_to_floors = @original_presendece_arr.deep_dup
      # update precedence array according to floor in below code 
      @community_units = @community.units.are_ploted_units.where.not(floorplate_id: nil).order(:building, :unit_type).includes(:door) # only plotted units
      @unit_with_door = {}
      @community_units.each do |unit| 
        if planned_to_visit_units_ids.include?(unit.id)
          if unit.door.present?
            planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
            @planned_to_visit_units_and_doors_ids << unit.door.id
            update_precedence_for_floors(unit.floor, 'unit', unit.id, unit.door.id)
          else
            @planned_to_visit_units_and_doors_ids << unit.id
          end 
          if @unit_with_door.has_key?(unit.floor)
            @unit_with_door[unit.floor] << { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
          else
            @unit_with_door[unit.floor] = [{ unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }]
          end
        end 
      end
      @amenities_doors = Amenity.where(amenityable_type: "Floorplate", amenityable_id: @floorplates.ids).includes(:doors)
      @amenity_with_doors = {}
      @amenities_doors.each do |amenity| 
        if planned_to_visit_amenities_ids.include?(amenity.id)
          if amenity.doors.present?
            planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
            @planned_to_visit_amenities_and_doors_ids << amenity_door(amenity).id # currenly connected with one of multiple door
            update_precedence_for_floors(amenity.floor, 'amenity', amenity.id, amenity_door(amenity).id)
          else
            @planned_to_visit_amenities_and_doors_ids << amenity.id
          end
          if @amenity_with_doors.has_key?(amenity.floor)
            @amenity_with_doors[amenity.floor] << { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }           
          else
            @amenity_with_doors[amenity.floor] = [{ amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }]
          end
        end
      end
      @starting_point = {x_plot: @community.community_tour.x_plot, y_plot: @community.community_tour.y_plot }
    end
    def fetch_related_data_for_floorplate(community_id)
      @stops_id_hash, @floor_lists_hash, @floorplate_hallways, @floorplate_access_points, @floor_to_floorplate_id, floor_to_elevators = {}, {}, {}, {}, {}, {}
      @community = Community.find community_id
      tour = @community.community_tour
      # stops input data hash connect with each floor 1 => stops, 2 => stops  
      tour_stops = tour&.tour_stops.plotted_stops.visible.order('sort ASC')
      tour_stops.each {|tour_stop| @stops_id_hash[tour_stop.id] = tour_stop.stop_id}
      @planned_to_visit_units_and_doors_ids, @planned_to_visit_amenities_and_doors_ids, @floors_specific_units, @floors_specific_amenities = [], [], {}, {}
      @floorplates = @community.floorplates
      @community.floorplates.map { |x| @floor_lists_hash[x.id] = x.floors }
      @floors_ids = @community.floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floor_to_floorplate_id = fetch_hash_for_floor_to_floorplate_id()
      @floorplates.each {|floorplate| @floorplate_hallways[floorplate.id] = floorplate.hallways.order("id ASC") }
      #@floorplates.each {|floorplate| @floorplate_access_points[floorplate.id] = floorplate.access_points } # For future use
      planned_to_visit_units_ids  = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity", display_stop: true).pluck(:stop_id) rescue []
      elevators_ids = tour_stops.where(stop_type: "elevator", display_stop: true).pluck(:stop_id) rescue []
      @floor_to_elevators = Elevator.fetch_elevator_according_to_floor(@floors_ids, elevators_ids)
      # @floor_to_elevators = UpdateTourStopsSortingOrder.new(@community, tour_user).nearest_elevator(tour_stops)
      floors_specific_units = fetch_units_according_to_floor(planned_to_visit_units_ids)
      floors_specific_amenities = fetch_amenities_according_to_floor(planned_to_visit_amenities_ids)
      @precedence_according_to_floors = fetch_unit_and_amenity_in_floor_by_floor_sorted_way(tour_stops, floors_specific_units, floors_specific_amenities, @floors_ids)
      # update precedence array according to floor in below code 
      @community_units = @community.units.are_ploted_units.where.not(floorplate_id: nil).order(:building, :unit_type).includes(:door) # only plotted units
      @unit_with_door = {}
      @community_units.each do |unit| 
        if planned_to_visit_units_ids.include?(unit.id)
          if unit.door.present?
            planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
            @planned_to_visit_units_and_doors_ids << unit.door.id
            update_precedence_for_floors(unit.floor, 'unit', unit.id, unit.door.id)
          else
            @planned_to_visit_units_and_doors_ids << unit.id
          end 
          if @unit_with_door.has_key?(unit.floor)
            @unit_with_door[unit.floor] << { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
          else
            @unit_with_door[unit.floor] = [{ unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }]
          end
        end
      end 
      @amenities_doors = Amenity.where(amenityable_type: "Floorplate", amenityable_id: @floorplates.ids).includes(:doors)
      @amenity_with_doors = {}
      @amenities_doors.each do |amenity| 
        if planned_to_visit_amenities_ids.include?(amenity.id)
          if amenity.doors.present?
            planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
            @planned_to_visit_amenities_and_doors_ids << amenity_door(amenity).id # currenly connected with one of multiple door
            update_precedence_for_floors(amenity.floor, 'amenity', amenity.id, amenity_door(amenity).id)
          else
            @planned_to_visit_amenities_and_doors_ids << amenity.id
          end
          if @amenity_with_doors.has_key?(amenity.floor)
            @amenity_with_doors[amenity.floor] << { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }           
          else
            @amenity_with_doors[amenity.floor] = [{ amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }]
          end
        end
      end
      @starting_point = {x_plot: @community.community_tour.x_plot, y_plot: @community.community_tour.y_plot }
    end
    def fetch_floorplate_related_data_for_multiple_buildings(community_id, building_list)
      @stops_id_hash, @floor_lists_hash, @floorplate_hallways, @floorplate_access_points, @floor_to_floorplate_id, floor_to_elevators, @building_starting_exit_points,@building_to_building_id = {}, {}, {}, {}, {}, {}, {}, {}
      @community = Community.find community_id
      tour = @community.community_tour
      # stops input data hash connect with each building => floor 1 => stops, 2 => stops  
      tour_stops = tour&.tour_stops.plotted_stops.visible.order('sort ASC')
      tour_stops.each {|tour_stop| @stops_id_hash[tour_stop.id] = tour_stop.stop_id}
      @planned_to_visit_units_and_doors_ids, @planned_to_visit_amenities_and_doors_ids, @floors_specific_units, @floors_specific_amenities = [], [], {}, {}
      @floorplates = @community.floorplates
      @community.floorplates.map { |x| @floor_lists_hash[x.id] = x.floors }
      @floors_ids = @community.floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floor_to_floorplate_id = fetch_hash_for_floor_to_floorplate_id()
      @floorplates.each {|floorplate| @floorplate_hallways[floorplate.id] = floorplate.hallways.order("id ASC") }
      #@floorplates.each {|floorplate| @floorplate_access_points[floorplate.id] = floorplate.access_points } # For future use
      planned_to_visit_units_ids  = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity", display_stop: true).pluck(:stop_id) rescue []
      building_starting_exit_points_ids = tour_stops.where(stop_type: "building_starting_point", display_stop: true).pluck(:stop_id) rescue []
      building_starting_exit_records = BuildingStartingPoint.fetch_building_starting_exit_points(building_starting_exit_points_ids)
      building_starting_exit_records.each {|building_starting_point| @building_starting_exit_points[building_starting_point.building] = { "id" => building_starting_point.id, "building_name" => building_starting_point.name ,"x_plot" => building_starting_point.x_plot, "y_plot" => building_starting_point.y_plot } }
      building_starting_exit_records.each {|building_starting_point| @building_to_building_id[building_starting_point.building] = building_starting_point.id }
      elevators_ids = tour_stops.where(stop_type: "elevator", display_stop: true).pluck(:stop_id) rescue []
      @building_to_floor_to_elevators = Elevator.fetch_elevator_according_to_building(@floors_ids, elevators_ids, building_list)
      # @building_to_floor_to_elevators = UpdateTourStopsSortingOrder.new(@community, tour_user).nearest_elevator(tour_stops)
      building_floors_specific_units = fetch_units_according_to_building_to_floor(planned_to_visit_units_ids, building_list)
      building_floors_specific_amenities = fetch_amenities_according_to_building_to_floor(planned_to_visit_amenities_ids, building_list)
      @precedence_according_to_building_to_floors = fetch_unit_and_amenity_in_floor_by_floor_sorted_way_for_building(tour_stops, building_floors_specific_units, building_floors_specific_amenities, @floors_ids, building_list)
      # update precedence array according to floor in below code 
      @community_units = @community.units.are_ploted_units.where.not(floorplate_id: nil, building: ["", nil]).order(:building, :unit_type).includes(:door) # only plotted units
      @unit_with_door = {}
      building_list.each {|building| @unit_with_door[building] = {}}

      @community_units.each do |unit|
        if planned_to_visit_units_ids.include?(unit.id)
          if unit.door.present?
            planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
            @planned_to_visit_units_and_doors_ids << unit.door.id
            update_precedence_for_building(unit.building, unit.floor, 'unit', unit.id, unit.door.id)
          else
            @planned_to_visit_units_and_doors_ids << unit.id
          end

          if @unit_with_door[unit.building].has_key?(unit.floor)
            @unit_with_door[unit.building][unit.floor] << { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
          else
            @unit_with_door[unit.building][unit.floor] = [{ unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }]
          end

        end
      end
      @amenities_doors = Amenity.where(amenityable_type: "Floorplate", amenityable_id: @floorplates.ids).includes(:doors)
      @amenity_with_doors = {}
      building_list.each {|building| @amenity_with_doors[building] = {}}
      @amenities_doors.each do |amenity| 
        if planned_to_visit_amenities_ids.include?(amenity.id)
          if amenity.doors.present?
            planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
            @planned_to_visit_amenities_and_doors_ids << amenity_door(amenity).id # currenly connected with one of multiple door
            update_precedence_for_building(amenity.building, amenity.floor, 'amenity', amenity.id, amenity_door(amenity).id)
          else
            @planned_to_visit_amenities_and_doors_ids << amenity.id
          end
          if @amenity_with_doors[amenity.building].has_key?(amenity.floor)
            @amenity_with_doors[amenity.building][amenity.floor] << { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }           
          else
            @amenity_with_doors[amenity.building][amenity.floor] = [{ amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }]
          end
        end
      end
      @starting_point = {x_plot: @community.community_tour.x_plot, y_plot: @community.community_tour.y_plot }
    end
    def fetch_floorplate_mobile_related_data_for_multiple_buildings(new_stops_arr, community_id, building_list, tour_user)
      @stops_id_hash, @floor_lists_hash, @floorplate_hallways, @floorplate_access_points, @floor_to_floorplate_id, floor_to_elevators, @building_starting_exit_points,@building_to_building_id = {}, {}, {}, {}, {}, {}, {}, {}
      @community = Community.find community_id
      tour = @community.community_tour
      # stops input data hash connect with each building => floor 1 => stops, 2 => stops  
      tour_stops_ids = new_stops_arr.pluck(:id)
      tour_stops = TourStop.where(id: tour_stops_ids)
      tour_stops.each {|tour_stop| @stops_id_hash[tour_stop.id] = tour_stop.stop_id}
      @planned_to_visit_units_and_doors_ids, @planned_to_visit_amenities_and_doors_ids, @floors_specific_units, @floors_specific_amenities = [], [], {}, {}
      @floorplates = @community.floorplates
      @community.floorplates.map { |x| @floor_lists_hash[x.id] = x.floors }
      @floors_ids = @community.floorplates.map { |x| x.floors }.flatten!.uniq.sort
      @floor_to_floorplate_id = fetch_hash_for_floor_to_floorplate_id()
      @floorplates.each {|floorplate| @floorplate_hallways[floorplate.id] = floorplate.hallways.order("id ASC") }
      #@floorplates.each {|floorplate| @floorplate_access_points[floorplate.id] = floorplate.access_points } # For future use
      planned_to_visit_units_ids  = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
      planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity", display_stop: true).pluck(:stop_id) rescue []
      building_starting_exit_points_ids = tour_stops.where(stop_type: "building_starting_point", display_stop: true).pluck(:stop_id) rescue []
      building_starting_exit_records = BuildingStartingPoint.fetch_building_starting_exit_points(building_starting_exit_points_ids)
      building_starting_exit_records.each {|building_starting_point| @building_starting_exit_points[building_starting_point.building] = { "id" => building_starting_point.id, "building_name" => building_starting_point.name ,"x_plot" => building_starting_point.x_plot, "y_plot" => building_starting_point.y_plot } }
      building_starting_exit_records.each {|building_starting_point| @building_to_building_id[building_starting_point.building] = building_starting_point.id }
      elevators_ids = tour_stops.where(stop_type: "elevator", display_stop: true).pluck(:stop_id) rescue []
      @building_to_floor_to_elevators = Elevator.fetch_elevator_according_to_building(@floors_ids, elevators_ids, building_list)
      # @building_to_floor_to_elevators = UpdateTourStopsSortingOrder.new(@community, tour_user).nearest_elevator(tour_stops)

      building_floors_specific_units = fetch_units_according_to_building_to_floor(planned_to_visit_units_ids, building_list)
      building_floors_specific_amenities = fetch_amenities_according_to_building_to_floor(planned_to_visit_amenities_ids, building_list)
      @original_presendece_arr = fetch_unit_and_amenity_in_floor_by_floor_sorted_way_for_building(tour_stops, building_floors_specific_units, building_floors_specific_amenities, @floors_ids, building_list)      
      @precedence_according_to_building_to_floors = @original_presendece_arr.deep_dup
      # update precedence array according to floor in below code 
      @community_units = @community.units.are_ploted_units.where.not(floorplate_id: nil, building: ["", nil]).order(:building, :unit_type).includes(:door) # only plotted units
      @unit_with_door = {}
      building_list.each {|building| @unit_with_door[building] = {}}
      @community_units.each do |unit| 
        if planned_to_visit_units_ids.include?(unit.id)
          if unit.door.present?
            planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
            @planned_to_visit_units_and_doors_ids << unit.door.id
            update_precedence_for_building(unit.building, unit.floor, 'unit', unit.id, unit.door.id)
          else
            @planned_to_visit_units_and_doors_ids << unit.id  
          end
          if @unit_with_door[unit.building].has_key?(unit.floor)
            @unit_with_door[unit.building][unit.floor] << { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
          else
            @unit_with_door[unit.building][unit.floor] = [{ unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }]
          end
        end 
      end
      @amenities_doors = Amenity.where(amenityable_type: "Floorplate", amenityable_id: @floorplates.ids).where.not(floor: [nil], building: ["", nil]).includes(:doors)
      @amenity_with_doors = {}
      building_list.each {|building| @amenity_with_doors[building] = {}}
      @amenities_doors.each do |amenity| 
        if planned_to_visit_amenities_ids.include?(amenity.id)
          if amenity.doors.present?
            planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
            @planned_to_visit_amenities_and_doors_ids << amenity_door(amenity).id # currenly connected with one of multiple door
            update_precedence_for_building(amenity.building, amenity.floor, 'amenity', amenity.id, amenity_door(amenity).id)
          else
            @planned_to_visit_amenities_and_doors_ids << amenity.id
          end

          if @amenity_with_doors[amenity.building].has_key?(amenity.floor)
            @amenity_with_doors[amenity.building][amenity.floor] << { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }           
          else
            @amenity_with_doors[amenity.building][amenity.floor] = [{ amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } }]
          end
        end
      end
      @starting_point = {x_plot: @community.community_tour.x_plot, y_plot: @community.community_tour.y_plot }
    end
    def fetch_units_according_to_building_to_floor(planned_to_visit_units_ids, building_list)
      building_to_floor_to_units = {}
      building_list.each {|building| building_to_floor_to_units[building] = {}}
      building_floor_and_unit = Unit.where(id: planned_to_visit_units_ids).where.not(building: ["", nil]).are_ploted_units.pluck(:building, :floor, :id)
      building_floor_and_unit.each do |f_u|
        building_to_floor_to_units[f_u[0]][f_u[1]] = building_to_floor_to_units[f_u[0]]&.keys&.include?(f_u[1]) ? (building_to_floor_to_units[f_u[0]][f_u[1]] + [f_u[2]]) : ([f_u[2]])
      end
      
      building_to_floor_to_units
    end
    def fetch_units_according_to_floor(planned_to_visit_units_ids)
      floor_units = {}
      floor_and_unit = Unit.where(id: planned_to_visit_units_ids).are_ploted_units.pluck(:floor, :id)
      floor_and_unit.each do |f_u|
        floor_units[f_u[0]] = floor_units.keys.include?(f_u[0]) ? (floor_units[f_u[0]] + [f_u[1]]) : ([f_u[1]])
      end
      floor_units
    end
    def fetch_amenities_according_to_floor(planned_to_visit_amenities_ids)
      floor_amenities = {}
      floor_and_amenity = Amenity.where(id: planned_to_visit_amenities_ids).pluck(:floor, :id)
      floor_and_amenity.each do |f_a|
        floor_amenities[f_a[0]] = floor_amenities.keys.include?(f_a[0]) ? (floor_amenities[f_a[0]] + [f_a[1]]) : ([f_a[1]])
      end
      floor_amenities
    end
    def fetch_amenities_according_to_building_to_floor(planned_to_visit_amenities_ids, building_list)
      building_floor_amenities = {}
      building_list.each {|building| building_floor_amenities[building] = {}}
      building_floor_and_amenity = Amenity.where(id: planned_to_visit_amenities_ids).where.not(floor: [nil], building: ["", nil]).pluck(:building, :floor, :id)
      building_floor_and_amenity.each do |f_a|
        building_floor_amenities[f_a[0]][f_a[1]] = building_floor_amenities[f_a[0]].keys.include?(f_a[1]) ? (building_floor_amenities[f_a[0]][f_a[1]] + [f_a[2]]) : ([f_a[2]])
      end
      building_floor_amenities
    end
    def fetch_unit_and_amenity_in_floor_by_floor_sorted_way(tour_stops, floors_specific_units, floors_specific_amenities, floors_ids)
      precedence_floor_hash = {}
      floors_ids.each do |floor|
        precedence_floor_hash[floor] = tour_stops.where("(stop_type = ? AND stop_id IN (?) ) OR (stop_type = ? AND stop_id IN (?))", 'unit', floors_specific_units[floor], 'amenity', floors_specific_amenities[floor]).order(:sort).pluck(:stop_id, :stop_type)
      end
      precedence_floor_hash
    end
    def fetch_unit_and_amenity_in_floor_by_floor_sorted_way_for_building(tour_stops, building_floors_specific_units, building_floors_specific_amenities, floors_ids, building_list)
      precedence_floor_hash = {}
      building_list.each {|building| precedence_floor_hash[building] = {}}
      building_list.each do |building|
        floors_ids.each do |floor|
          precedence_floor_hash[building][floor] = tour_stops.where("(stop_type = ? AND stop_id IN (?) ) OR (stop_type = ? AND stop_id IN (?))", 'unit', building_floors_specific_units[building][floor], 'amenity', building_floors_specific_amenities[building][floor]).order(:sort).pluck(:stop_id, :stop_type)
        end
      end
      precedence_floor_hash
    end
    def fetch_hash_for_floor_to_floorplate_id()
      h = {}
      @floor_lists_hash.each do |key, arr|
        arr.each do |floor|
          h[floor] = key
        end
      end
      h
    end
    def fetch_paths_arr(path_object_in_order)
      stops_id_hash_reverse = convert_values_into_keys(@stops_id_hash)
      len = path_object_in_order.keys().length - 1
      path = []
      source_type = "Tour"
      source_id = 0
      path_points = []
      tour_stop_type_arr = ["unit", "amenity"]
      path_object_in_order.keys()[1..len].each do |key|
        if path_object_in_order[key].has_key?("point_type")
          path_points << {"x_plot" => path_object_in_order[key]["door_x_plot"].to_f, "y_plot" => path_object_in_order[key]["door_y_plot"].to_f} if path_object_in_order[key].has_key?("is_door") && path_object_in_order[key]["is_door"]
          if path_object_in_order[key].has_key?("is_door") && path_object_in_order[key]["is_door"]
            door = Door.find path_object_in_order[key]["door_id"]
            stop = door.attached_with
            path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
          elsif path_object_in_order[key].has_key?("is_door") && !path_object_in_order[key]["is_door"]
            stop = path_object_in_order[key]["point_type"].classify.constantize.find path_object_in_order[key]["door_id"]
            path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
          end
          dest_type = tour_stop_type_arr.include?(path_object_in_order[key]["point_type"]) ? "TourStop" : "Tour"
          dest_id = path_object_in_order[key].has_key?("door_id") ? stops_id_hash_reverse[path_object_in_order[key]["door_id"]] : 0
          path << [source_type, dest_type, source_id, dest_id, path_points]
          source_type = dest_type
          source_id = dest_id
          path_points = []
        else
          path_points << {"x_plot" => path_object_in_order[key]["x_plot"], "y_plot" => path_object_in_order[key]["y_plot"]}
        end
      end
      path
    end
    def fetch_paths_arr_for_floorplate(path_object_in_order, traverse_back_path_object_in_order, starting_floor_stop_to_starting_point_object_in_order)
      stops_id_hash_reverse = convert_values_into_keys(@stops_id_hash)
      path = []
      source_type = "Tour"
      from = "building_starting_point"
      source_id = 0
      path_points = []
      tour_stop_type_arr = ["unit", "amenity", "elevator"]
      @floors_ids.each_with_index do |floor, indx|
        len = path_object_in_order[floor].keys().length - 1
        path_object_keys = indx == 0 ? (path_object_in_order[floor].keys()[1..len]) : path_object_in_order[floor].keys()[0..len]
        path_object_keys.each do |key|
          if path_object_in_order[floor][key].has_key?("point_type")
            path_points << {"x_plot" => path_object_in_order[floor][key]["door_x_plot"].to_f, "y_plot" => path_object_in_order[floor][key]["door_y_plot"].to_f} if path_object_in_order[floor][key].has_key?("is_door") && path_object_in_order[floor][key]["is_door"]
            if path_object_in_order[floor][key].has_key?("is_door") && path_object_in_order[floor][key]["is_door"] # if its unit or amenity and have door
              door = Door.find path_object_in_order[floor][key]["door_id"]
              stop = door.attached_with
              path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
            elsif (path_object_in_order[floor][key].has_key?("is_door") && !path_object_in_order[floor][key]["is_door"]) # if its unit or amenity and have no door
              stop = path_object_in_order[floor][key]["point_type"].classify.constantize.find path_object_in_order[floor][key]["door_id"]
              path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
            elsif path_object_in_order[floor][key]["point_type"] == "elevator" # if its a elevator
              stop = path_object_in_order[floor][key]["point_type"].classify.constantize.find path_object_in_order[floor][key]["elevator_id"]
              path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
            end
            dest_type = tour_stop_type_arr.include?(path_object_in_order[floor][key]["point_type"]) ? "TourStop" : "Tour"
            dest_id = path_object_in_order[floor][key].has_key?("door_id") ? stops_id_hash_reverse[path_object_in_order[floor][key]["door_id"]] : (path_object_in_order[floor][key]["point_type"] == "elevator" ? path_object_in_order[floor][key]["elevator_id"] : 0)
            to = path_object_in_order[floor][key]["point_type"]
            path << [source_type, dest_type, source_id, dest_id, path_points, from, to, floor]
            source_type = dest_type
            source_id = dest_id
            from = to
            path_points = []
          else
            path_points << {"x_plot" => path_object_in_order[floor][key]["x_plot"], "y_plot" => path_object_in_order[floor][key]["y_plot"]}
          end
        end
      end
      updated_upstair_path, upstair_elevator_hash = update_path_by_removing_floor(path)
      updated_downstair_path, downstair_elevator_hash = [], {}
      # Now for Downstair
      if @floors_ids.size > 1
        path = []
        source_type = "TourStop"
        from = "elevator"
        source_id = traverse_back_path_object_in_order[@floors_ids.reverse().first][0]["elevator_id"]
        path_points = []
        tour_stop_type_arr = ["elevator"]
        @floors_ids[0..@floors_ids.length-2].reverse().each do |floor, indx|
          len = traverse_back_path_object_in_order[floor].keys().length - 1
          path_object_keys = traverse_back_path_object_in_order[floor].keys()[0..len]
          path_object_keys.each do |key|
            if traverse_back_path_object_in_order[floor][key].has_key?("point_type")
              stop = traverse_back_path_object_in_order[floor][key]["point_type"].classify.constantize.find traverse_back_path_object_in_order[floor][key]["elevator_id"]
              path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
              dest_type = "TourStop"
              dest_id = traverse_back_path_object_in_order[floor][key]["elevator_id"]
              to = traverse_back_path_object_in_order[floor][key]["point_type"]
              path << [source_type, dest_type, source_id, dest_id, path_points, from, to, floor]
              source_type = dest_type
              source_id = dest_id
              from = to
              path_points = []
            else
              path_points << {"x_plot" => traverse_back_path_object_in_order[floor][key]["x_plot"], "y_plot" => traverse_back_path_object_in_order[floor][key]["y_plot"]}
            end
          end
        end
        updated_downstair_path, downstair_elevator_hash = update_path_by_removing_floor(path)
        # Now for starting point
        source_type = "TourStop"
        from = "elevator"
        source_id = starting_floor_stop_to_starting_point_object_in_order[0]["elevator_id"]
      end
      path = []
      path_points = []
      tour_stop_type_arr = ["building_starting_point"]
      len = starting_floor_stop_to_starting_point_object_in_order.keys().length - 1
      path_object_keys = starting_floor_stop_to_starting_point_object_in_order.keys()[1..len]
      path_object_keys.each do |key|
        if starting_floor_stop_to_starting_point_object_in_order[key].has_key?("point_type")
          stop = @community.community_tour
          path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
          dest_type = "Tour"
          dest_id = 0
          to = starting_floor_stop_to_starting_point_object_in_order[key]["point_type"]
          path << [source_type, dest_type, source_id, dest_id, path_points, from, to, @floors_ids.first]
        else
          path_points << {"x_plot" => starting_floor_stop_to_starting_point_object_in_order[key]["x_plot"], "y_plot" => starting_floor_stop_to_starting_point_object_in_order[key]["y_plot"]}
        end
      end
      starting_point_path = path
      actual_path = updated_upstair_path + updated_downstair_path + starting_point_path
      return actual_path, upstair_elevator_hash, downstair_elevator_hash
    end
    def fetch_paths_arr_for_floorplate_multiple_buildings(path_object_in_order)
      tour_stop_type_arr = ["Unit", "unit", "Amenity", "amenity", "elevator", "Elevator", "building_starting_exit_point", "building_starting_point"]
      stops_id_hash_reverse = convert_values_into_keys(@stops_id_hash)
      path = []; source_type = "Tour"; from = "building_starting_point"; source_id = 0; path_points = [], actual_path = [] #initialize it for access in 2d loop
      @upstair_elevator_hash, @downstair_elevator_hash = {}, {}
      @building_list.each {|building| @upstair_elevator_hash[building] = {}; @downstair_elevator_hash[building] = {}; }
      @building_list.each do |building|
        # for upstair
        @floors_ids[building].each_with_index do |floor, indx|
          len = path_object_in_order[building]["upside_path_objects"][floor].keys().length - 1  
          if @building_list.first == building && @floors_ids[building].first == floor
            # here you must always have first point which is called starting point
            path = []
            source_type = "Tour"
            from = "building_starting_point"
            source_id = 0
            path_points = []
            path_object_keys = path_object_in_order[building]["upside_path_objects"][floor].keys()[1..len]
          elsif @floors_ids[building].first == floor # for other buildings and first floor
            path_object_keys = path_object_in_order[building]["upside_path_objects"][floor].keys()[1..len]
          else
            path_object_keys = path_object_in_order[building]["upside_path_objects"][floor].keys()[0..len]
          end
          if path_object_keys.present?
            path_object_keys.each do |key|
              point = path_object_in_order[building]["upside_path_objects"][floor][key]
              if point.has_key?("point_type")
                path_points << {"x_plot" => point["door_x_plot"].to_f, "y_plot" => point["door_y_plot"].to_f} if point.has_key?("is_door") && point["is_door"]
                if point.has_key?("is_door") && point["is_door"] # if its unit or amenity and have door
                  door = Door.find point["door_id"]
                  stop = door.attached_with
                  path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
                elsif (point.has_key?("is_door") && !point["is_door"]) # if its unit or amenity and have no door
                  stop = point["point_type"].classify.constantize.find point["door_id"]
                  path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
                elsif point["point_type"] == "elevator" # if its a elevator
                  stop = point["point_type"].classify.constantize.find point["elevator_id"]
                  path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
                elsif point["point_type"] == "building_starting_exit_point" # if its a building entry/exit point
                  stop = BuildingStartingPoint.find point["building_starting_exit_id"]
                  path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
                end
                dest_type = tour_stop_type_arr.include?(point["point_type"]) ? "TourStop" : "Tour"
                dest_id = fetch_destination_stop_id(point, stops_id_hash_reverse)
                to = point["point_type"]
                path << [source_type, dest_type, source_id, dest_id, path_points, from, to, floor, building]
                source_type = dest_type
                source_id = dest_id
                from = to
                path_points = []
              else
                path_points << {"x_plot" => point["x_plot"], "y_plot" => point["y_plot"]}
              end
            end
          end
        end
        actual_path += update_path_by_removing_floor_for_buildings(path, "upstair")
        path = []
        #for downstair
        if @floors_ids[building][0..@floors_ids[building].length-2].size > 2 # if community have 1 builidng and 1 stop on first floor
          source_type = "TourStop"
          from = "elevator"
          source_id = path_object_in_order[building]["downside_path_objects"][@floors_ids[building].reverse.first][0]["elevator_id"]
        else
          source_type = "TourStop"
          from = "TourStop"
          source_id = fetch_destination_stop_id(path_object_in_order[building]["downside_path_objects"][@floors_ids[building].reverse.first][0], stops_id_hash_reverse)
        end
        path_points = []
        @floors_ids[building][0..@floors_ids[building].length-2].reverse().each do |floor, indx|
          len = path_object_in_order[building]["downside_path_objects"][floor].keys().length - 1
          path_object_keys = path_object_in_order[building]["downside_path_objects"][floor].keys()[0..len]
          path_object_keys.each do |key|
            point = path_object_in_order[building]["downside_path_objects"][floor][key]
            if point.has_key?("point_type") && !point.has_key?("is_door")
              if point["point_type"] == "elevator" # if its a elevator
                stop = point["point_type"].classify.constantize.find point["elevator_id"]
                dest_id = point["elevator_id"]
              elsif point["point_type"] == "building_starting_exit_point" # if its a building entry/exit point
                stop = BuildingStartingPoint.find point["building_starting_exit_id"]
                dest_id = point["building_starting_exit_id"]
              elsif point["point_type"] == "building_starting_point"
                stop = @community.community_tour
                dest_id = 0    
              end
              path_points << {"x_plot" => stop.x_plot.to_f, "y_plot" => stop.y_plot.to_f}
              dest_type = point["point_type"] == "building_starting_point" ? "Tour" : "TourStop" 
              to = point["point_type"]
              path << [source_type, dest_type, source_id, dest_id, path_points, from, to, floor, building]
              source_type = dest_type
              source_id = dest_id
              from = to
              path_points = []
            elsif point.has_key?("point_type") && point.has_key?("is_door")
              stop = point["is_door"] ? ((Door.find(point["door_id"])).attached_with) : (point["point_type"].classify.constantize.find point["door_id"])
              path_points << {"x_plot" => stop.x_plot, "y_plot" => stop.y_plot}
            else
              path_points << {"x_plot" => point["x_plot"], "y_plot" => point["y_plot"]}
            end
          end
        end
        actual_path += update_path_by_removing_floor_for_buildings(path, "downstair")
        path = []
      end
      actual_path
    end

    def fetch_destination_stop_id(point, stops_id_hash_reverse)
      if point.present?
        if point.has_key?("door_id")
          dest_id = stops_id_hash_reverse[point["door_id"]]
        elsif point["point_type"] == "elevator" 
          dest_id = point["elevator_id"]
        elsif point["point_type"] == "building_starting_exit_point" 
          dest_id = point["building_starting_exit_id"]
        else
          dest_id = 0
        end
      
      else
        dest_id = 0
      end

      dest_id
    end

    def update_path_by_removing_floor(stop_to_stop_path)
      source_id, dest_id, source_stop, destination_stop, floor_index =2, 3, 5, 6, 7
      need_to_ignore_stops = ["unit", "amenity", "building_starting_point"]
      elevator_hash = {}
      stop_to_stop_path.each_with_index do |path, indx|
        if (need_to_ignore_stops.include?(path[source_stop]) && path[destination_stop] == "elevator")
          elevator_hash[path[floor_index]] = elevator_hash[path[floor_index]].nil? ? ([path[dest_id]]) : (elevator_hash[path[floor_index]] + [path[dest_id]])
        elsif path[source_stop] == "elevator" && path[destination_stop] == "elevator" && path[source_id] == path[dest_id]
          stop_to_stop_path = stop_to_stop_path - [path]
        elsif path[source_stop] == "elevator" && path[destination_stop] == "elevator" && path[source_id] != path[dest_id]
          elevator_hash[path[floor_index]] = elevator_hash[path[floor_index]].nil? ? ([path[dest_id]]) : (elevator_hash[path[floor_index]] + [path[dest_id]])      
        end
      end
      return stop_to_stop_path, elevator_hash
    end
    def update_path_by_removing_floor_for_buildings(stop_to_stop_path, type)
      source_id, dest_id, source_stop, destination_stop, floor_index, building_index =2, 3, 5, 6, 7, 8
      need_to_ignore_stops = ["unit", "amenity", "building_starting_point", "building_starting_exit_point"]
      elevator_hash = {}
      stop_to_stop_path.each_with_index do |path, indx|
        if (need_to_ignore_stops.include?(path[source_stop]) && path[destination_stop] == "elevator")
          @upstair_elevator_hash[path[building_index]][path[floor_index]] = @upstair_elevator_hash[path[floor_index]].nil? ? ([path[dest_id]]) : (@upstair_elevator_hash[path[floor_index]] + [path[dest_id]]) if type == "upstair"
          @downstair_elevator_hash[path[building_index]][path[floor_index]] = @downstair_elevator_hash[path[floor_index]].nil? ? ([path[dest_id]]) : (@downstair_elevator_hash[path[floor_index]] + [path[dest_id]]) if type == "downstair"
        elsif (path[source_stop] == "elevator" || path[destination_stop] == "elevator") && path[source_id] == path[dest_id]
          stop_to_stop_path = stop_to_stop_path - [path]
        elsif path[source_stop] == "elevator" && path[destination_stop] == "elevator" && path[source_id] != path[dest_id]
          @upstair_elevator_hash[path[building_index]][path[floor_index]] = @upstair_elevator_hash[path[floor_index]].nil? ? ([path[dest_id]]) : (@upstair_elevator_hash[path[floor_index]] + [path[dest_id]]) if type == "upstair"
          @downstair_elevator_hash[path[building_index]][path[floor_index]] = @downstair_elevator_hash[path[floor_index]].nil? ? ([path[dest_id]]) : (@downstair_elevator_hash[path[floor_index]] + [path[dest_id]]) if type == "downstair"
        end
      end
      stop_to_stop_path
    end
    def update_new_stops_arr(new_stops_arr, upstair_elevator_hash, downstair_elevator_hash) # sort stops according mobile path 
      stops_arr = [@community.community_tour]
      # for upstair
      @original_presendece_arr.keys().sort().each do |floor|
        if @original_presendece_arr[floor].present?
          @original_presendece_arr[floor].each do |arr|
            indx = find_index_for_stop(new_stops_arr, arr[0], arr[1])
            if indx != -1
              stops_arr << new_stops_arr[indx]
            end
          end
        end
        if upstair_elevator_hash[floor].present?
          upstair_elevator_hash[floor].each do |elevator_id|
            stops_arr << TourStop.find_by(stop_type: "elevator", stop_id: elevator_id)
          end
        end
      end
      # for downstair
      (downstair_elevator_hash.keys().sort_by { |h| h * -1 }).each do |desc_floor|
        downstair_elevator_hash[desc_floor].each do |ele_id|
          stops_arr << TourStop.find_by(stop_type: "elevator", stop_id: ele_id)
        end
      end
      stops_arr << @community.community_tour
      stops_arr
    end
    def update_new_stops_arr_for_multiple_buildings(new_stops_arr) # sort stops according mobile path 
      stops_arr = []
      @building_list.each do |building|
        # add starting point and building start/exit point
        if @building_list.first ==  building
          stops_arr << @community.community_tour
          tour_stop_of_building = TourStop.find_by(stop_type: "building_starting_point", stop_id: @building_to_building_id[building])
          
          if tour_stop_of_building.present?
            tour_stop_of_building.name = "Building #{building}"
            stops_arr << tour_stop_of_building
          end
        end
        # for upstair
        @original_presendece_arr[building].keys().sort().each do |floor|
          if @original_presendece_arr[building][floor].present?
            @original_presendece_arr[building][floor].each do |arr|
              indx = find_index_for_stop(new_stops_arr, arr[0], arr[1])
              if indx != -1
                stops_arr << new_stops_arr[indx]
              end
            end
          end
          if @upstair_elevator_hash[building][floor].present?
            @upstair_elevator_hash[building][floor].each do |elevator_id|
              stops_arr << TourStop.find_by(stop_type: "elevator", stop_id: elevator_id)
            end
          end
        end
        # for downstair
        (@downstair_elevator_hash[building].keys().sort_by { |h| h * -1 }).each do |desc_floor|
          @downstair_elevator_hash[building][desc_floor].each do |ele_id|
            stops_arr << TourStop.find_by(stop_type: "elevator", stop_id: ele_id)
          end
        end
        # add next building start/exit point OR starting point/ exit point if last building
        if @building_list[@building_list.find_index(building) + 1].present? # means there is next building present
          tour_stop_of_building = TourStop.find_by(stop_type: "building_starting_point", stop_id: @building_to_building_id[@building_list[@building_list.find_index(building) + 1]])
          if tour_stop_of_building.present?
            tour_stop_of_building.name = "Building #{@building_list[@building_list.find_index(building) + 1]}"
            stops_arr << tour_stop_of_building
          end
        else # its last building
          stops_arr << @community.community_tour
        end
      end
      stops_arr
    end
    def find_index_for_stop(new_stops_arr, stop_id, stop_type)
      indx = -1
      new_stops_arr.each_with_index do |stop, indx|
        if stop.stop_id == stop_id && stop.stop_type == stop_type
          return indx
        end
      end
      return indx
    end
    def get_unit_data(hallways, unit_with_door)
      algo_unit_data = []
      hallways.each_with_index do |hallway, i|
        unit_with_door.each_with_index do |unit, j|
          if (unit[:unit_info][:door].present?) # if unit have door
            a = hallway.x_plot - unit[:unit_info][:door].x_plot;
            b = hallway.y_plot - unit[:unit_info][:door].y_plot;
            c = Math::sqrt(a * a + b * b);
            if (i > 0) # Now every time loop on remaining hallways points and update distance info 
              indx = algo_unit_data.index{ |x| x['door_id'] == unit[:unit_info][:door].id };
              if  algo_unit_data[indx]['distance'] > c
                algo_unit_data[indx]['hallway_id'] = hallway.id;
                algo_unit_data[indx]['distance'] = c;
                algo_unit_data[indx]['hallway_x_plot'] = hallway.x_plot;
                algo_unit_data[indx]['hallway_y_plot'] = hallway.y_plot;
              end
            else
              h = {};
              h['hallway_id'] = hallway.id;
              h['hallway_x_plot'] = hallway.x_plot;
              h['hallway_y_plot'] = hallway.y_plot;
              h['door_id'] = unit[:unit_info][:door].id;
              h['door_x_plot'] = unit[:unit_info][:door].x_plot;
              h['door_y_plot'] = unit[:unit_info][:door].y_plot;
              h['distance'] = c;
              h['is_door'] = true;
              h['point_type'] = "unit";
              algo_unit_data.push(h);
            end
          else
            a = hallway.x_plot - unit[:unit_info][:unit][:x_plot];
            b = hallway.y_plot - unit[:unit_info][:unit][:y_plot];
            c = Math::sqrt(a * a + b * b);
            if (i > 0)
              indx = algo_unit_data.index{ |x| x['door_id'] == unit[:unit_info][:unit][:id] }
              if algo_unit_data[indx]['distance'] > c
                algo_unit_data[indx]['hallway_id'] = hallway.id
                algo_unit_data[indx]['distance'] = c
                algo_unit_data[indx]['hallway_x_plot'] = hallway.x_plot
                algo_unit_data[indx]['hallway_y_plot'] = hallway.y_plot
              end
            else
              h = {}
              h['hallway_id'] = hallway.id
              h['hallway_x_plot'] = hallway.x_plot
              h['hallway_y_plot'] = hallway.y_plot
              h['door_id'] = unit[:unit_info][:unit][:id]
              h['door_x_plot'] = unit[:unit_info][:unit][:x_plot]
              h['door_y_plot'] = unit[:unit_info][:unit][:y_plot]
              h['distance'] = c
              h['is_door'] = false
              h['point_type'] = "unit"
              algo_unit_data.push(h)
            end
          end
        end
      end
      algo_unit_data
    end
    def get_elevator_data(hallways, elevators_ids, current_floor)
      algo_elevator_data = []
      elevators = Elevator.where(id: elevators_ids)
      hallways.each_with_index do |hallway, i|
        elevators.each do |elevator|
          a = hallway.x_plot - elevator.x_plot
          b = hallway.y_plot - elevator.y_plot
          c = Math::sqrt(a * a + b * b);
          if (i > 0)
            indx = algo_elevator_data.index{ |x| x['elevator_id'] == elevator.id }
            if algo_elevator_data[indx]['distance'] > c
              algo_elevator_data[indx]['hallway_id'] = hallway.id
              algo_elevator_data[indx]['distance'] = c
              algo_elevator_data[indx]['hallway_x_plot'] = hallway.x_plot
              algo_elevator_data[indx]['hallway_y_plot'] = hallway.y_plot
            end
          else
            h = {}
            h['hallway_id'] = hallway.id
            h['hallway_x_plot'] = hallway.x_plot
            h['hallway_y_plot'] = hallway.y_plot
            h['elevator_id'] = elevator.id
            h['elevator_x_plot'] = elevator.x_plot
            h['elevator_y_plot'] = elevator.y_plot
            h['distance'] = c
            h['max_floor'] = elevator.max_floor
            h['min_floor'] = elevator.min_floor
            h['building'] = elevator.building
            h['floor'] = current_floor
            h['point_type'] = "elevator"
            algo_elevator_data.push(h)
          end
        end
      end
      algo_elevator_data
    end
    def get_amenity_data(hallways, amenity_with_doors)
      algo_amenity_data = []
      hallways.each_with_index do |hallway, i|
        amenity_with_doors.each_with_index do |amenity, j|
          if (amenity[:amenity_info][:door].present?) # if amenity have 1 or more doors
            amenity[:amenity_info][:door].each_with_index do |door, k|
              a = hallway.x_plot - door.x_plot;
              b = hallway.y_plot - door.y_plot;
              c = Math::sqrt(a * a + b * b);
              if (i > 0) # Now every time loop on remaining hallways points and update distance info 
                indx = algo_amenity_data.index{ |x| x['door_id'] == door.id };
                if  algo_amenity_data[indx]['distance'] > c
                  algo_amenity_data[indx]['hallway_id'] = hallway.id;
                  algo_amenity_data[indx]['distance'] = c;
                  algo_amenity_data[indx]['hallway_x_plot'] = hallway.x_plot;
                  algo_amenity_data[indx]['hallway_y_plot'] = hallway.y_plot;
                end
              else
                h = {};
                h['hallway_id'] = hallway.id;
                h['hallway_x_plot'] = hallway.x_plot;
                h['hallway_y_plot'] = hallway.y_plot;
                h['door_id'] = door.id;
                h['door_x_plot'] = door.x_plot;
                h['door_y_plot'] = door.y_plot;
                h['distance'] = c;
                h['is_door'] = true;
                h['point_type'] = "amenity";
                algo_amenity_data.push(h);
              end
            end
          else
            a = hallway.x_plot - amenity[:amenity_info][:amenity][:x_plot];
            b = hallway.y_plot - amenity[:amenity_info][:amenity][:y_plot];
            c = Math::sqrt(a * a + b * b);
            if (i > 0)
              indx = algo_amenity_data.index{ |x| x['door_id'] == amenity[:amenity_info][:amenity][:id] }
              if algo_amenity_data[indx]['distance'] > c
                algo_amenity_data[indx]['hallway_id'] = hallway.id
                algo_amenity_data[indx]['distance'] = c
                algo_amenity_data[indx]['hallway_x_plot'] = hallway.x_plot
                algo_amenity_data[indx]['hallway_y_plot'] = hallway.y_plot
              end
            else
              h = {}
              h['hallway_id'] = hallway.id
              h['hallway_x_plot'] = hallway.x_plot
              h['hallway_y_plot'] = hallway.y_plot
              h['door_id'] = amenity[:amenity_info][:amenity][:id]
              h['door_x_plot'] = amenity[:amenity_info][:amenity][:x_plot]
              h['door_y_plot'] = amenity[:amenity_info][:amenity][:y_plot]
              h['distance'] = c
              h['is_door'] = false
              h['point_type'] = "amenity"
              algo_amenity_data.push(h)
            end
          end
        end
      end
      algo_amenity_data
    end
    def get_starting_point_data(hallways)
      start_point_data = {}
      hallways.each_with_index do |hallway, i|
        a = hallway.x_plot - @starting_point[:x_plot];
        b = hallway.y_plot - @starting_point[:y_plot];
        c = Math::sqrt(a * a + b * b);
        if !start_point_data.present?
          start_point_data['hallway_id'] = hallway.id;
          start_point_data['hallway_x_plot'] = hallway.x_plot;
          start_point_data['hallway_y_plot'] = hallway.y_plot;
          start_point_data['hallway_y_plot'] = hallway.y_plot;
          start_point_data['distance'] = c;
          start_point_data['point_type'] = "building_starting_point";
          start_point_data['building_starting_x_plot'] = @starting_point[:x_plot];
          start_point_data['building_starting_y_plot'] = @starting_point[:y_plot];
        end
        if c < start_point_data['distance']
            start_point_data['hallway_id'] = hallway.id;
            start_point_data['hallway_x_plot'] = hallway.x_plot;
            start_point_data['hallway_y_plot'] = hallway.y_plot;
            start_point_data['distance'] = c;
        end
      end
      start_point_data
    end
    def get_building_starting_exit_point_data(hallways, building_starting_exit_points)
      algo_building_start_exit_data = []
      hallways.each_with_index do |hallway, i|
        building_starting_exit_points.values.each do |building_start_exit_point|
          a = hallway.x_plot - building_start_exit_point['x_plot']
          b = hallway.y_plot - building_start_exit_point['y_plot']
          c = Math::sqrt(a * a + b * b);
          if (i > 0)
            indx = algo_building_start_exit_data.index{ |x| x['building_starting_exit_id'] == building_start_exit_point['id'] }
            if algo_building_start_exit_data[indx]['distance'] > c
              algo_building_start_exit_data[indx]['hallway_id'] = hallway.id
              algo_building_start_exit_data[indx]['distance'] = c
              algo_building_start_exit_data[indx]['hallway_x_plot'] = hallway.x_plot
              algo_building_start_exit_data[indx]['hallway_y_plot'] = hallway.y_plot
            end
          else
            h = {}
            h['hallway_id'] = hallway.id
            h['hallway_x_plot'] = hallway.x_plot
            h['hallway_y_plot'] = hallway.y_plot
            h['building_starting_exit_id'] = building_start_exit_point['id']
            h['building_starting_exit_x_plot'] = building_start_exit_point['x_plot']
            h['building_starting_exit_y_plot'] = building_start_exit_point['y_plot']
            h['distance'] = c
            h['point_type'] = "building_starting_exit_point"
            algo_building_start_exit_data.push(h)
          end
        end
      end
      algo_building_start_exit_data
    end
    def get_access_point_data()
      algo_access_point_data = []
      @access_points.each_with_index do |access_point, z|
        @hallways.each_with_index do |first_hallway, j|
          first_hallway.next_points.each_with_index do |element, i|
            second_hallway = @hallways.where(id: element).first
            a1 = first_hallway.x_plot - access_point.x_plot;
            b1 = first_hallway.y_plot - access_point.y_plot;
            d1 = Math::sqrt(a1 * a1 + b1 * b1);
            a2 = second_hallway.x_plot - access_point.x_plot;
            b2 = second_hallway.y_plot - access_point.y_plot;
            d2 = Math::sqrt(a2 * a2 + b2 * b2);
            if z == algo_access_point_data.length
              h = {}
              h['hallway_id_1'] = first_hallway.id;
              h['hallway_x_plot_1'] = first_hallway.x_plot;
              h['hallway_y_plot_1'] = first_hallway.y_plot;
              h['h1_access_point'] = d1;
              h['hallway_id_2'] = second_hallway.id;
              h['hallway_x_plot_2'] = second_hallway.x_plot;
              h['hallway_y_plot_2'] = second_hallway.y_plot;
              h['h2_access_point'] = d2;
              h['access_point_id'] = @access_points[z].id;
              h['access_point_x_plot'] = @access_points[z].x_plot;
              h['access_point_y_plot'] = @access_points[z].y_plot;
              h['point_type'] = "access_point"
              algo_access_point_data.push(h);
            else
              if d1 < algo_access_point_data[z]['h1_access_point'] && d2 < algo_access_point_data[z]['h2_access_point']
                algo_access_point_data[z]['hallway_id_1'] = first_hallway.id;
                algo_access_point_data[z]['hallway_x_plot_1'] = first_hallway.x_plot;
                algo_access_point_data[z]['hallway_y_plot_1'] = first_hallway.y_plot;
                algo_access_point_data[z]['h1_access_point'] = d1;
                algo_access_point_data[z]['hallway_id_2'] = second_hallway.id;
                algo_access_point_data[z]['hallway_x_plot_2'] = second_hallway.x_plot;
                algo_access_point_data[z]['hallway_y_plot_2'] = second_hallway.y_plot;
                algo_access_point_data[z]['h2_access_point'] = d2;
              end
            end
          end
        end
      end
      algo_access_point_data
    end
    def fetch_hallways_coordinates_with_distance(hallways)
      new_hallways_coordinates = {}
      hallways.each_with_index do |point, indx|
        new_point = {}
        new_point['id'] = point.id;
        new_point['x_plot'] = point.x_plot;
        new_point['y_plot'] = point.y_plot;
        new_point['selected'] = point.selected;
        new_point['parent_id'] = point.parent_id;
        new_point['parent_type'] = point.parent_type;
        new_point['next_points'] = point.next_points;
        new_point['next_points_distance'] = [];
        point.next_points.each_with_index do |element, i|
          obj  = hallways.where(id: element).first
          if obj.present?
            id   = obj.id.to_s;
            a    = point.x_plot - obj.x_plot;
            b    = point.y_plot - obj.y_plot;
            c    = Math::sqrt(a * a + b * b);
            temp = {id => c};
            new_point['next_points_distance'].push(temp);
          end
        end
        new_hallways_coordinates[point.id] = new_point;
      end
      new_hallways_coordinates
    end
    def make_hallways_id_to_uniq_id(new_hallways_coordinates, is_starting_floor)
      hallways_id_to_uniq_id = {}
      new_hallways_coordinates.keys.each_with_index do |element, i|
        if is_starting_floor
          hallways_id_to_uniq_id[element] = (i + 1)
        else
          hallways_id_to_uniq_id[element] = (i)
        end
      end
      hallways_id_to_uniq_id
    end
    def make_hallways_data_for_dijakstra(new_hallways_coordinates, hallways_id_to_uniq_id)
      hallways_dijkstra_data = {}
      new_hallways_coordinates.keys.each do |key|
        obj = {}
        new_hallways_coordinates[key]["next_points_distance"].each_with_index do |attached_points_obj, indx|
          temp_obj = {}
          obj_key = attached_points_obj.keys()[0].to_i
          obj[hallways_id_to_uniq_id[obj_key]] = attached_points_obj.values[0]
          obj_distance = attached_points_obj.values[0]
          temp_obj[hallways_id_to_uniq_id[key]] = obj_distance
          if hallways_dijkstra_data[hallways_id_to_uniq_id[obj_key]].present? # if already object exist
            hallways_dijkstra_data[hallways_id_to_uniq_id[obj_key]] = hallways_dijkstra_data[hallways_id_to_uniq_id[obj_key]].merge(temp_obj)
          else
            hallways_dijkstra_data[hallways_id_to_uniq_id[obj_key]] = temp_obj
          end
        end
        if hallways_dijkstra_data[hallways_id_to_uniq_id[key]] # if already object exist
          hallways_dijkstra_data[hallways_id_to_uniq_id[key]] = hallways_dijkstra_data[hallways_id_to_uniq_id[key]].merge(obj)
        else
          hallways_dijkstra_data[hallways_id_to_uniq_id[key]] = obj  
        end
      end
      hallways_dijkstra_data
    end
    def make_unit_data_according_to_door_id(algo_unit_data)
      unit_data = {}
      algo_unit_data.each do |unit|
        unit_data[unit['door_id']] = unit
      end
      unit_data
    end
    def make_building_starting_point_data_according_to_building_starting_point_id(building_starting_point_data)
      building_data = {}
      building_starting_point_data.each do |building_starting_point|
        building_data[building_starting_point['building_starting_exit_id']] = building_starting_point
      end
      building_data
    end
    def make_elevator_data_according_to_elevator_id(algo_elevator_data)
      elevator_data = {}
      algo_elevator_data.each do |elevator|
        elevator_data[elevator['elevator_id']] = elevator
      end
      elevator_data
    end
    def make_unit_id_to_uniq_id(starting_index, unit_data)
      unit_id_to_uniq_id = {}
      unit_data.keys.each do |key|
        unit_id_to_uniq_id[key] = starting_index
        starting_index+=1
      end
      unit_id_to_uniq_id
    end
    def make_building_start_id_to_uniq_id(starting_index, building_start_p_data)
      building_start_id_to_uniq_id = {}
      building_start_p_data.keys.each do |key|
        building_start_id_to_uniq_id[key] = starting_index
        starting_index+=1
      end
      building_start_id_to_uniq_id
    end
    def make_elevator_id_to_uniq_id(starting_index, elevator_data)
      elevator_id_to_uniq_id = {}
      elevator_data.keys.each do |key|
        elevator_id_to_uniq_id[key] = starting_index
        starting_index+=1
      end
      elevator_id_to_uniq_id
    end
    def make_unit_data_for_dijakstra(unit_data, unit_id_to_uniq_id, hallways_id_to_uniq_id, stops)
      unit_dijkstra_data = {}
      unit_data.keys.each do |key|
        obj = {}
        obj[hallways_id_to_uniq_id[unit_data[key]['hallway_id']]] = unit_data[key]['distance']  
        unit_dijkstra_data[unit_id_to_uniq_id[key]] = obj
        obj2 = {}
        obj2[unit_id_to_uniq_id[key]] = unit_data[key]['distance']  
        stops[hallways_id_to_uniq_id[unit_data[key]['hallway_id']]] = stops[hallways_id_to_uniq_id[unit_data[key]['hallway_id']]].merge(obj2)
      end
      unit_dijkstra_data
    end
    def make_building_start_data_for_dijakstra(building_start_data, building_start_id_to_uniq_id, hallways_id_to_uniq_id, stops)
      b_start_dijkstra_data = {}
      building_start_data.keys.each do |key|
        obj = {}
        obj[hallways_id_to_uniq_id[building_start_data[key]['hallway_id']]] = building_start_data[key]['distance']  
        b_start_dijkstra_data[building_start_id_to_uniq_id[key]] = obj
        obj2 = {}
        obj2[building_start_id_to_uniq_id[key]] = building_start_data[key]['distance']  
        stops[hallways_id_to_uniq_id[building_start_data[key]['hallway_id']]] = stops[hallways_id_to_uniq_id[building_start_data[key]['hallway_id']]].merge(obj2)
      end
      b_start_dijkstra_data
    end
    def make_elevator_data_for_dijakstra(elevator_data, elevator_id_to_uniq_id, hallways_id_to_uniq_id, stops)
      elevator_dijkstra_data = {}
      elevator_data.keys.each do |key|
        obj = {}
        obj[hallways_id_to_uniq_id[elevator_data[key]['hallway_id']]] = elevator_data[key]['distance']  
        elevator_dijkstra_data[elevator_id_to_uniq_id[key]] = obj
        obj2 = {}
        obj2[elevator_id_to_uniq_id[key]] = elevator_data[key]['distance']  
        stops[hallways_id_to_uniq_id[elevator_data[key]['hallway_id']]] = stops[hallways_id_to_uniq_id[elevator_data[key]['hallway_id']]].merge(obj2)
      end
      elevator_dijkstra_data
    end
    def make_amenity_data_according_to_door_id(algo_amenity_data)
      amenity_data = {}
      algo_amenity_data.each do |amenity| 
        amenity_data[amenity['door_id']] = amenity
      end
      amenity_data
    end
    def make_amenity_id_to_uniq_id(starting_index, amenity_data)
      amenity_id_to_uniq_id = {}
      amenity_data.keys.each do |key|
        amenity_id_to_uniq_id[key] = starting_index
        starting_index+=1
      end
      amenity_id_to_uniq_id
    end
    def make_amenity_data_for_dijakstra(amenity_data, amenity_id_to_uniq_id, hallways_id_to_uniq_id, stops)
      amenity_dijkstra_data = {}
      amenity_data.keys.each do |key|
        obj = {}
        obj[hallways_id_to_uniq_id[amenity_data[key]['hallway_id']]] = amenity_data[key]['distance']  
        amenity_dijkstra_data[amenity_id_to_uniq_id[key]] = obj
        obj2 = {}
        obj2[amenity_id_to_uniq_id[key]] = amenity_data[key]['distance']  
        stops[hallways_id_to_uniq_id[amenity_data[key]['hallway_id']]] = stops[hallways_id_to_uniq_id[amenity_data[key]['hallway_id']]].merge(obj2)
      end
      amenity_dijkstra_data
    end
    def update_precedence_unit_arr(unit_id_to_uniq_id)
      unit_visited_ids = []
      @planned_to_visit_units_and_doors_ids.each_with_index do |element, i|
        unit_visited_ids.push(unit_id_to_uniq_id[element])
        update_precedence_arr("unit", element, unit_id_to_uniq_id[element])
      end
      unit_visited_ids
    end
    def update_precedence_unit_arr_for_floor(unit_id_to_uniq_id, floor)
      @planned_to_visit_units_and_doors_ids.each_with_index do |element, i|
        update_precedence_arr_for_floor("unit", element, unit_id_to_uniq_id[element], floor)
      end
    end
    def update_precedence_unit_arr_for_building(unit_id_to_uniq_id, building, floor)
      @planned_to_visit_units_and_doors_ids.each_with_index do |element, i|
        update_precedence_arr_for_building("unit", element, unit_id_to_uniq_id[element], building, floor)
      end
    end
    def update_precedence_amenity_arr_for_floor(amenity_id_to_uniq_id, floor)
      @planned_to_visit_amenities_and_doors_ids.each_with_index do |element, i|
        update_precedence_arr_for_floor("amenity", element, amenity_id_to_uniq_id[element], floor)
      end
    end
    def update_precedence_amenity_arr_for_building(amenity_id_to_uniq_id, building, floor)
      @planned_to_visit_amenities_and_doors_ids.each_with_index do |element, i|
        update_precedence_arr_for_building("amenity", element, amenity_id_to_uniq_id[element], building, floor)
      end
    end
    def update_precedence_amenity_arr(amenity_id_to_uniq_id)
      amenity_visited_ids = []
      @planned_to_visit_amenities_and_doors_ids.each_with_index do |element, i|
        amenity_visited_ids.push(amenity_id_to_uniq_id[element])
        update_precedence_arr("amenity", element, amenity_id_to_uniq_id[element])
      end
      amenity_visited_ids
    end
    def update_precedence_arr(stop_type, door_id, uniq_id)
      @precedence_arr.each_with_index do |p_arr, i|
        if (p_arr[1] == stop_type) && (p_arr[0] == door_id)
          @precedence_arr[i] = [uniq_id, stop_type]
          break
        end
      end
    end
    def update_precedence_arr_for_floor(stop_type, door_id, uniq_id, floor)
      @precedence_according_to_floors[floor].each_with_index do |p_arr, i|
        if (p_arr[1] == stop_type) && (p_arr[0] == door_id)
          @precedence_according_to_floors[floor][i] = [uniq_id, stop_type]
          break
        end
      end
    end
    def update_precedence_arr_for_building(stop_type, door_id, uniq_id, building, floor)
      @precedence_according_to_building_to_floors[building][floor].each_with_index do |p_arr, i|
        if (p_arr[1] == stop_type) && (p_arr[0] == door_id)
          @precedence_according_to_building_to_floors[building][floor][i] = [uniq_id, stop_type]
          break
        end
      end
    end
    def add_nodes_edges_and_its_cost(stops)
      stops.each do |start_key, h|
        h.keys.each do |key|
          @gr.add_edge(start_key, key, h[key])
        end
      end
    end
    def get_floor_by_floor_precedence_of_unit_and_amnity
      precedence_hash = {}
      @floors_ids.each do |floor|
        arr = []
        @precedence_according_to_floors[floor].each {|p_arr| arr.push(p_arr[0]) }
        precedence_hash[floor] = arr
      end
      precedence_hash
    end
    def get_buildings_floor_by_floor_precedence_of_unit_and_amnity
      precedence_hash = {}
      @building_list.each { |building| precedence_hash[building] = {} }
      @building_list.each do |building|
        @floors_ids.each do |floor|
          arr = []
          @precedence_according_to_building_to_floors[building][floor].each {|p_arr| arr.push(p_arr[0]) }
          precedence_hash[building][floor] = arr
        end
      end
      precedence_hash
    end
    def get_elevator_uniq_ids(elevator_id_to_uniq_id)
      elevator_uniq_ids = {}
      @floors_ids.each do |floor|
        elevator_uniq_ids[floor] = elevator_id_to_uniq_id[floor].values
      end
      elevator_uniq_ids
    end
    def get_elevator_uniq_ids_for_building(elevator_id_to_uniq_id)
      elevator_uniq_ids = {}
      @building_list.each { |building| elevator_uniq_ids[building] = {} }
      @building_list.each do |building|
        @floors_ids.each do |floor|
          elevator_uniq_ids[building][floor] = elevator_id_to_uniq_id[building][floor].values
        end
      end
      elevator_uniq_ids
    end
    def get_uniq_id_to_elevator(elevator_id_to_uniq_id)
      uniq_id_to_elevator = {}
      @floors_ids.each do |floor|
        elevator_id_to_uniq_id[floor].each do |key, value|
          if uniq_id_to_elevator.has_key?(floor)
            uniq_id_to_elevator[floor] = uniq_id_to_elevator[floor].merge({value => key})
          else
            uniq_id_to_elevator[floor] = {value => key}
          end
        end
      end
      uniq_id_to_elevator
    end
    def get_uniq_id_to_elevator_for_building(elevator_id_to_uniq_id)
      uniq_id_to_elevator = {}
      @building_list.each { |building| uniq_id_to_elevator[building] = {} }
      @building_list.each do |building|
        @floors_ids.each do |floor|
          elevator_id_to_uniq_id[building][floor].each do |key, value|
            if uniq_id_to_elevator[building].has_key?(floor)
              uniq_id_to_elevator[building][floor] = uniq_id_to_elevator[building][floor].deep_merge({value => key})
            else
              uniq_id_to_elevator[building][floor] = {value => key}
            end
          end
        end
      end
      uniq_id_to_elevator
    end
    def elevators_which_have_next_floor(elevator_arr, uniq_id_to_elevator_hash, floor)
      have_next_floor_elevator = []
      elevator_arr.each do |ele|
        if @elevator_data[floor][uniq_id_to_elevator_hash[ele]]["max_floor"].present? && @elevator_data[floor][uniq_id_to_elevator_hash[ele]]["max_floor"] > floor
          have_next_floor_elevator << ele 
        end
      end
      have_next_floor_elevator
    end
    def elevators_which_have_next_floor_in_building(elevator_arr, uniq_id_to_elevator_hash, building, floor)
      have_next_floor_elevator = []
      elevator_arr.each do |ele|
        if @elevator_data[building][floor][uniq_id_to_elevator_hash[ele]]["max_floor"].present? && @elevator_data[building][floor][uniq_id_to_elevator_hash[ele]]["max_floor"] > floor
          have_next_floor_elevator << ele 
        end
      end
      have_next_floor_elevator
    end
    def elevators_which_have_previous_floor(elevator_arr, uniq_id_to_elevator_hash, floor)
      have_previous_floor_elevator = []
      elevator_arr.each do |ele|
        if @elevator_data[floor][uniq_id_to_elevator_hash[ele]]["min_floor"].present? && @elevator_data[floor][uniq_id_to_elevator_hash[ele]]["min_floor"] < floor
          have_previous_floor_elevator << ele 
        end
      end
      
      have_previous_floor_elevator
    end
    def elevators_which_have_previous_floor_in_building(elevator_arr, uniq_id_to_elevator_hash, building, floor)
      have_previous_floor_elevator = []
      elevator_arr.each do |ele|
        if @elevator_data[building][floor][uniq_id_to_elevator_hash[ele]]["min_floor"].present? && @elevator_data[building][floor][uniq_id_to_elevator_hash[ele]]["min_floor"] < floor
          have_previous_floor_elevator << ele 
        end
      end
      have_previous_floor_elevator
    end
    def have_elevator_on_current_floor(source, uniq_id_to_elevator_for_floor, floor)
      if uniq_id_to_elevator_for_floor.any?
        elevator_id = uniq_id_to_elevator_for_floor[source]
        @floor_to_elevators[floor].include?(elevator_id)
      else
        false
      end
    end
    def have_elevator_on_current_floor_for_building(source, uniq_id_to_elevator_for_floor, building, floor)
      if uniq_id_to_elevator_for_floor&.any?
        elevator_id = uniq_id_to_elevator_for_floor[source]
        @building_to_floor_to_elevators[building][floor].include?(elevator_id)
      else
        false
      end
    end
    def get_floor_by_floor_graph
      floors_graph = {}
      @floors_ids.each do |floor|
        floors_graph[floor] = add_floor_graph(@stops[floor])
      end
      floors_graph
    end
    def get_building_to_building_with_floors_graph
      floors_graph = {}
      @building_list.each { |building| floors_graph[building] = {} }
      @building_list.each do |building|
        @floors_ids.each do |floor|
          floors_graph[building][floor] = add_floor_graph(@stops[building][floor])
        end
      end
      floors_graph
    end
    def add_floor_graph(stops)
      graph = Graph.new
      stops.each do |start_key, h|
        h.keys.each do |key|
          graph.add_edge(start_key, key, h[key])
        end
      end
      graph
    end
    def merge_path_two_d_arr_for_web(complete_path)
      complete_arr = complete_path[0]
      complete_path[1..(complete_path.length - 1)].each do |arr|
        complete_arr += arr[1..(arr.length - 1)]
      end
      complete_arr
    end
    def fetch_flattan_path_of_each_floor(complete_path, floors_ids)
      flatten_hash = {}
      floors_ids.each do |floor|
        flatten_arr  = []
        complete_path[floor].each_with_index do |arr, indx|
          if (complete_path[floor].length - 1) == indx
            flatten_arr += arr[0..(arr.length - 1)]
          else
            flatten_arr += arr[0..(arr.length - 2)]
          end
        end
        flatten_hash[floor] = flatten_arr
      end
      flatten_hash
    end
    def fetch_path_object(path_uniq_ids_arr, hallways_id_to_uniq_id, unit_id_to_uniq_id, amenity_id_to_uniq_id, start_point_data, new_hallways_coordinates, unit_data, amenity_data, unit_starting_index, amenity_starting_index)
      path_object_in_order = {}
      hallways_uniq_id_to_org_id = convert_values_into_keys(hallways_id_to_uniq_id)
      unit_uniq_id_to_org_id = convert_values_into_keys(unit_id_to_uniq_id)
      amenity_uniq_id_to_org_id = convert_values_into_keys(amenity_id_to_uniq_id)
      path_uniq_ids_arr.each_with_index do |element, i|
        if (element == 0 ) # for starting point
          path_object_in_order[i] = start_point_data
        elsif (element < unit_starting_index) # then its hallways points
          path_object_in_order[i] = new_hallways_coordinates[hallways_uniq_id_to_org_id[element]]
        elsif (element < amenity_starting_index) # then its units points
          path_object_in_order[i] = unit_data[unit_uniq_id_to_org_id[element]]
        else # concider remaining all amenities points
          path_object_in_order[i] = amenity_data[amenity_uniq_id_to_org_id[element]]
        end
      end
      path_object_in_order    
    end
    def fetch_path_object_for_floor(path_uniq_ids_arr, hallways_id_to_uniq_id, unit_id_to_uniq_id, amenity_id_to_uniq_id, elevator_id_to_uniq_id, start_point_data, new_hallways_coordinates, unit_data, amenity_data, elevator_data, unit_starting_index, amenity_starting_index, elevator_starting_index, starting_floor)
      path_object_in_order = {}
      hallways_uniq_id_to_org_id = convert_values_into_keys(hallways_id_to_uniq_id)
      unit_uniq_id_to_org_id = convert_values_into_keys(unit_id_to_uniq_id)
      amenity_uniq_id_to_org_id = convert_values_into_keys(amenity_id_to_uniq_id)
      elevator_uniq_id_to_org_id = convert_values_into_keys(elevator_id_to_uniq_id)
      begin
        path_uniq_ids_arr.each_with_index do |element, i|
          if (element == 0  && starting_floor) # for starting point
            path_object_in_order[i] = start_point_data
          elsif (element < unit_starting_index) # then its hallways points
            path_object_in_order[i] = new_hallways_coordinates[hallways_uniq_id_to_org_id[element]]
          elsif (element < amenity_starting_index) # then its units points
            path_object_in_order[i] = unit_data[unit_uniq_id_to_org_id[element]]
          elsif (element < elevator_starting_index) # then its amenities points 
            path_object_in_order[i] = amenity_data[amenity_uniq_id_to_org_id[element]]
          else # concider remaining all elevator points
            path_object_in_order[i] = elevator_data[elevator_uniq_id_to_org_id[element]]
          end
        end
      rescue => e
      end
      path_object_in_order    
    end
    def fetch_path_object_for_building(path_uniq_ids_arr, hallways_id_to_uniq_id, unit_id_to_uniq_id, amenity_id_to_uniq_id, elevator_id_to_uniq_id, start_point_data, new_hallways_coordinates, unit_data, amenity_data, elevator_data, unit_starting_index, amenity_starting_index, elevator_starting_index, building, floor, building_starting_index = nil, building_starting_point_data = nil, building_start_id_to_uniq_id = nil)
      path_object_in_order = {}
      hallways_uniq_id_to_org_id = convert_values_into_keys(hallways_id_to_uniq_id)
      unit_uniq_id_to_org_id = convert_values_into_keys(unit_id_to_uniq_id)
      amenity_uniq_id_to_org_id = convert_values_into_keys(amenity_id_to_uniq_id)
      elevator_uniq_id_to_org_id = convert_values_into_keys(elevator_id_to_uniq_id)
      path_uniq_ids_arr.compact.each_with_index do |element, i|
        if starting_point_for_building(building, floor)
          building_uniq_id_to_org_id = convert_values_into_keys(building_start_id_to_uniq_id)
          if (element == 0 ) # for starting point
            path_object_in_order[i] = start_point_data
          elsif (building_starting_index.present? && element < building_starting_index) # then its hallways points
            path_object_in_order[i] = new_hallways_coordinates[hallways_uniq_id_to_org_id[element]]
          elsif (element < unit_starting_index) # then its building starting point
            path_object_in_order[i] = building_starting_point_data[building_uniq_id_to_org_id[element]]
          elsif (element < amenity_starting_index) # then its units points
            path_object_in_order[i] = unit_data[unit_uniq_id_to_org_id[element]]
          elsif (element < elevator_starting_index) # then its amenities points 
            path_object_in_order[i] = amenity_data[amenity_uniq_id_to_org_id[element]]
          else # consider remaining all elevator points
            path_object_in_order[i] = elevator_data[elevator_uniq_id_to_org_id[element]]
          end
        elsif building_starting_point_for_building(building, floor) # For first floor and middle buildings
          building_uniq_id_to_org_id = convert_values_into_keys(building_start_id_to_uniq_id)
          if (element < building_starting_index) # then its hallways points
            path_object_in_order[i] = new_hallways_coordinates[hallways_uniq_id_to_org_id[element]]
          elsif (element < unit_starting_index) # then its building starting point
            path_object_in_order[i] = building_starting_point_data[building_uniq_id_to_org_id[element]]
          elsif (element < amenity_starting_index) # then its units points
            path_object_in_order[i] = unit_data[unit_uniq_id_to_org_id[element]]
          elsif (element < elevator_starting_index) # then its amenities points 
            path_object_in_order[i] = amenity_data[amenity_uniq_id_to_org_id[element]]
          else # consider remaining all elevator points
            path_object_in_order[i] = elevator_data[elevator_uniq_id_to_org_id[element]]
          end
        else # For Upper floors (not for first floor)
          if (element < unit_starting_index) # then its hallways points
            path_object_in_order[i] = new_hallways_coordinates[hallways_uniq_id_to_org_id[element]]
          elsif (element < amenity_starting_index) # then its units points
            path_object_in_order[i] = unit_data[unit_uniq_id_to_org_id[element]]
          elsif (element < elevator_starting_index) # then its amenities points 
            path_object_in_order[i] = amenity_data[amenity_uniq_id_to_org_id[element]]
          else # consider remaining all elevator points
            path_object_in_order[i] = elevator_data[elevator_uniq_id_to_org_id[element]]
          end
        end
      end
      path_object_in_order    
    end
    def convert_values_into_keys(id_to_uniq_id)
      uniq_id_org_id = {}
      keys_arr = id_to_uniq_id.keys
      values_arr = id_to_uniq_id.values
      keys_arr.each_with_index do |element, i|
        uniq_id_org_id[values_arr[i]] = element
      end
      uniq_id_org_id
    end
    def initialize_stops_with_buildings(*args)
      building_hash_arr = []
      building_hash = {}
      @building_list.each {|building| building_hash[building] = {}}
      if args.count == 1
        return building_hash.deep_dup
      else
        args.count.times { |a| building_hash_arr << building_hash.deep_dup }  
      end
      building_hash_arr
    end
    def starting_point_for_building(building, floor)
      #(@building_list.first == building || @building_list.last == building) && @floors_ids.first == floor #currenly i'm attaching staring point on all first of every building
      if @floors_ids.is_a?(Hash)
        return @floors_ids[building].first == floor
      else
        return @floors_ids.first == floor
      end
    end
    def building_starting_point_for_building(building, floor)
      if @floors_ids.is_a?(Hash)
        return @floors_ids[building].first == floor
      else
        return @floors_ids.first == floor
      end
    end
    def change_three_d_path_to_one_d_path(path_object_in_order)
      path_objects = []
      @building_list.each do |building|
        @floors_ids[building].each do |floor|
          path_objects << [building.parameterize.underscore, floor, path_object_in_order[building]["upside_path_objects"][floor]]
        end
        @floors_ids[building].reverse.each do |floor|
          path_objects << [building.parameterize.underscore, floor, path_object_in_order[building]["downside_path_objects"][floor]]
        end
      end
      path_objects
    end
    def remove_buildings_which_have_no_any_stop_to_visit(precedence_visited_ids_by_floor)
      need_to_remove_building = []
      @building_list.each do |building|
        @floors_ids.each do |floor|
          if @floors_ids.last == floor && !(precedence_visited_ids_by_floor[building][floor].any?)
            need_to_remove_building << building
          elsif precedence_visited_ids_by_floor[building][floor].any?
            break
          end
        end
      end
      @building_list -= need_to_remove_building
    end 
    def updated_floors_ids_and_collect_last_floor_id_against_each_building(precedence_visited_ids_by_floor)
      @last_floor_against_building = {}
      @building_list.each { |building| @last_floor_against_building[building] = @floors_ids.last}
      @building_list.each do |building|
        @floors_ids.reverse.each do |floor|
          if precedence_visited_ids_by_floor[building][floor].any?
            @last_floor_against_building[building] = floor
            break;
          end  
        end  
      end
      building_floors_ids = {}
      @last_floor_against_building.keys.each do |building|
        building_floors_ids[building] = @floors_ids[0..@floors_ids.find_index(@last_floor_against_building[building])]
      end
      @floors_ids = building_floors_ids
    end
    def fetch_last_floor(precedence_visited_ids_by_floor)
      last_floor = @floors_ids.last
      @floors_ids.reverse.each do |floor|
        if precedence_visited_ids_by_floor[floor].any?
          last_floor = floor
          break;
        end
      end
      last_floor
    end

    def amenity_door amenity
      # amenity.doors.order("created_at ASC").first
      amenity.doors.order("sort ASC").first
    end

end