module ShortestPath
  include DijkstraAlgo

  def return_path(community_id, path_type)
    fetch_related_data(community_id)
    stops = {}
    algo_unit_data = get_unit_data()
    algo_amenity_data = get_amenity_data()
    start_point_data = get_starting_point_data()
    algo_access_point_data = get_access_point_data()
    new_hallways_coordinates = fetch_hallways_coordinates_with_distance()
    hallways_id_to_uniq_id = make_hallways_id_to_uniq_id(new_hallways_coordinates)
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
    unit_visited_ids = fetch_from_uniq_unit_arr(unit_id_to_uniq_id)
    amenity_visited_ids = fetch_from_uniq_amenity_arr(amenity_id_to_uniq_id)
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
  private
    def update_precedence(stop_type, stop_id, door_id)
      @precedence_arr.each_with_index do |arr,index|
        if arr[1] == stop_type && arr[0] == stop_id
          @precedence_arr[index] = [door_id, stop_type]
          break
        end
      end
    end
    def fetch_related_data(community_id)
      @community = Community.find community_id
      tour = @community.tour
      tour_stops = tour&.tour_stops.visible.order('sort ASC')
      @precedence_arr = tour_stops.pluck(:stop_id, :stop_type) # due to sortable gem its sorted so we fetch in a line 
      @planned_to_visit_units_and_doors_ids     = []
      @planned_to_visit_amenities_and_doors_ids = []
      if @community.is_sitemap
        @sitemap = @community.sitemap
        @hallways = @sitemap.hallways.order("id ASC")
        @access_points = @sitemap.access_points
        planned_to_visit_units_ids     = tour_stops.where(stop_type: "unit", display_stop: true).pluck(:stop_id) rescue []
        planned_to_visit_amenities_ids = tour_stops.where(stop_type: "amenity",display_stop: true).pluck(:stop_id) rescue []
        @community_units = @community.units.are_ploted_units.where(floorplate_id: nil).order(:building, :unit_type).includes(:door) # only plotted units
        @unit_with_door = @community_units.map do |unit| 
          if planned_to_visit_units_ids.include?(unit.id) && unit.door.present?
            planned_to_visit_units_ids = planned_to_visit_units_ids - [unit.id]
            @planned_to_visit_units_and_doors_ids << unit.door.id
            update_precedence('unit', unit.id, unit.door.id)
          elsif planned_to_visit_units_ids.include?(unit.id)
            @planned_to_visit_units_and_doors_ids << unit.id
          end 
          { unit_info: { unit: { id: unit.id, name: unit.name, building: unit.building, provider_id: unit.provider_unit_id, x_plot: unit.x_plot, y_plot: unit.y_plot }, door: unit.door.present? ? unit.door : {} } }
        end 

        @amenities_doors = @sitemap.amenities.includes(:doors)
        @amenity_with_doors = @amenities_doors.map do |amenity| 
          if planned_to_visit_amenities_ids.include?(amenity.id) && amenity.doors.present?
            planned_to_visit_amenities_ids = planned_to_visit_amenities_ids - [amenity.id]
            @planned_to_visit_amenities_and_doors_ids << amenity.doors.first.id # currenly connected with one of multiple door
            update_precedence('amenity', amenity.id, amenity.doors.first.id)
          elsif planned_to_visit_amenities_ids.include?(amenity.id)
            @planned_to_visit_amenities_and_doors_ids << amenity.id
          end
          { amenity_info: { amenity: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.provider_amenity_id, x_plot: amenity.x_plot, y_plot: amenity.y_plot }, door: amenity.doors.present? ? amenity.doors : {} } } 
        end
        @building_starting_point = {x_plot: @community.tour.x_plot, y_plot: @community.tour.y_plot };
      else

      end
    end
    def get_unit_data()
      algo_unit_data = []
      @hallways.each_with_index do |hallway, i|
        @unit_with_door.each_with_index do |unit, j|
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
    def get_amenity_data()
      algo_amenity_data = []
      @hallways.each_with_index do |hallway, i|
        @amenity_with_doors.each_with_index do |amenity, j|
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
    def get_starting_point_data()
      start_point_data = {}
      @hallways.each_with_index do |hallway, i|
        a = hallway.x_plot - @building_starting_point[:x_plot];
        b = hallway.y_plot - @building_starting_point[:y_plot];
        c = Math::sqrt(a * a + b * b);
        if !start_point_data.present?
          start_point_data['hallway_id'] = hallway.id;
          start_point_data['hallway_x_plot'] = hallway.x_plot;
          start_point_data['hallway_y_plot'] = hallway.y_plot;
          start_point_data['hallway_y_plot'] = hallway.y_plot;
          start_point_data['distance'] = c;
          start_point_data['point_type'] = "building_starting_point";
          start_point_data['building_starting_x_plot'] = @building_starting_point[:x_plot];
          start_point_data['building_starting_y_plot'] = @building_starting_point[:y_plot];
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
    def fetch_hallways_coordinates_with_distance
      new_hallways_coordinates = {}
      @hallways.each_with_index do |point, indx|
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
          obj  = @hallways.where(id: element).first
          id   = obj.id.to_s;
          a    = point.x_plot - obj.x_plot;
          b    = point.y_plot - obj.y_plot;
          c    = Math::sqrt(a * a + b * b);
          temp = {id => c};
          new_point['next_points_distance'].push(temp);
        end
        new_hallways_coordinates[point.id] = new_point;
      end
      new_hallways_coordinates
    end
    def make_hallways_id_to_uniq_id(new_hallways_coordinates)
      hallways_id_to_uniq_id = {}
      new_hallways_coordinates.keys.each_with_index do |element, i|
        hallways_id_to_uniq_id[element] = (i + 1)
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
    def make_unit_id_to_uniq_id(starting_index, unit_data)
      unit_id_to_uniq_id = {}
      unit_data.keys.each do |key|
        unit_id_to_uniq_id[key] = starting_index
        starting_index+=1
      end
      unit_id_to_uniq_id
    end
    def make_unit_data_for_dijakstra(unit_data, unit_id_to_uniq_id, hallways_id_to_uniq_id, stops)
      unit_dijkstra_data = {}
      unit_data.keys.each do |key|
        obj = {};
        obj[hallways_id_to_uniq_id[unit_data[key]['hallway_id']]] = unit_data[key]['distance']  
        unit_dijkstra_data[unit_id_to_uniq_id[key]] = obj
        obj2 = {};
        obj2[unit_id_to_uniq_id[key]] = unit_data[key]['distance']  
        stops[hallways_id_to_uniq_id[unit_data[key]['hallway_id']]] = stops[hallways_id_to_uniq_id[unit_data[key]['hallway_id']]].merge(obj2)
      end
      unit_dijkstra_data
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
    def fetch_from_uniq_unit_arr(unit_id_to_uniq_id)
      unit_visited_ids = []
      @planned_to_visit_units_and_doors_ids.each_with_index do |element, i|
        unit_visited_ids.push(unit_id_to_uniq_id[element])
        update_precedence_arr("unit", element, unit_id_to_uniq_id[element])
      end
      unit_visited_ids
    end
    def fetch_from_uniq_amenity_arr(amenity_id_to_uniq_id)
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
    def add_nodes_edges_and_its_cost(stops)
      stops.each do |start_key, h|
        h.keys.each do |key|
          @gr.add_edge(start_key, key, h[key])
        end
      end
    end
    def merge_path_two_d_arr_for_web(complete_path)
      complete_arr = complete_path[0]
      complete_path[1..(complete_path.length - 1)].each do |arr|
        complete_arr += arr[1..(arr.length - 1)]
      end
      complete_arr
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
    def convert_values_into_keys(id_to_uniq_id)
      uniq_id_org_id = {}
      keys_arr = id_to_uniq_id.keys
      values_arr = id_to_uniq_id.values
      keys_arr.each_with_index do |element, i|
        uniq_id_org_id[values_arr[i]] = element
      end
      uniq_id_org_id
    end
end