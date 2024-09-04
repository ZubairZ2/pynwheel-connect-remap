class UpdateTourStopsSortingOrder
  def initialize(community, tour_user)
    return unless community.present? && tour_user.present?
    @community = community
    @tour_user = tour_user
    @tour = get_tour
  end

  def sort
    @community.is_sitemap ? sort_sitemap_stops : sort_floorplate_stops
  end

  def nearest_elevator(tour_stops)
    is_multiple_building, building_list = ShortestPath.check_stops_have_multiple_buildings(tour_stops, @community, @tour_user)
    elevators = {}
  
    building_list&.each do |building|
      starting_point = get_building_starting_point(building) || sitemap_starting_point
      elevators[building] = {}
  
      floors&.each_with_index do |floor, index|
        floor_stop_ids = @tour&.sort_hash["#{building},#{floor}"]
        last_stop_id = floor_stop_ids&.last
        tour_stop = TourStop.find_by(id: last_stop_id)
  
        actual_stop = tour_stop ? fetch_actual_stop(tour_stop) : nil
        current_point = actual_stop || starting_point
        elevator = get_elevator(building, floor, current_point)
  
        if is_multiple_building
          elevators[building][floor] = [elevator.id]
        else
          elevators[floor] = [elevator.id]
        end
  
        starting_point = elevator
      end
    end
  
    elevators
  end
  
  private

  def sort_sitemap_stops
    stops_points = fetch_stops_points(get_tour_stops)

    # sorted_points = sort_stops_by_distance(sitemap_starting_point, stops_points)
    sorted_points = sort_stops_by_previous_point(sitemap_starting_point, stops_points)

    sorted_stops = fetch_sorted_tour_stops(sorted_points)
    update_stops_sorting_order(sorted_stops)
  end

  # New method to sort stops based on the previous stop
  def sort_stops_by_previous_point(starting_point, stops_list)
    return [] unless stops_list.present?

    sorted_stops = []
    current_point = starting_point

    until stops_list.empty?
      next_stop = stops_list&.min_by { |stop| distance(current_point, stop) }

      if next_stop.present?
        sort_doors_by_distance(current_point, next_stop)
        sorted_stops << next_stop
        stops_list.delete(next_stop)
        current_point = next_stop
      end
    end

    sorted_stops
  end

  def sort_doors_by_distance current_point, next_stop
    if next_stop[:stop_type] === "amenity"
      amenity = Amenity.find_by_id  next_stop[:stop_id]
      doors = amenity.ordered_doors

      if doors.present? && doors.count > 1
        # nearest_door = doors&.min_by { |door| distance(current_point, door) }
        doors = doors.sort_by { |door| distance(current_point, door) }

        doors.each_with_index do |door, index|
          door.update_column(:sort, index + 1)
        end

      end
    end
  end

  def sort_floorplate_stops
    sort_single_building_floorplate_stops
  end
  
  def get_building_starting_point building
    bsp = BuildingStartingPoint.find_by(community_id: @community.id,building: building)
    bsp
  end

  def skip_sorting f
    (@community.id == 2938 && f == 2) ? true : false
  end

  def sort_single_building_floorplate_stops
    g_index = 1

    buildings&.each do |b|
      bsp = get_building_starting_point(b)
      current_point = (bsp.present? ? bsp : sitemap_starting_point)

      floors&.each_with_index do |f, f_index|
        floor_stop_ids = @tour&.sort_hash["#{b},#{f}"]

        if floor_stop_ids.present?
          unless skip_sorting(f)
            starting_point = f_index > 0 ? get_elevator(b, f, current_point) : (bsp.present? ? bsp : sitemap_starting_point) # for the first floor use tour as starting point
            floor_stops = get_floor_stops(floor_stop_ids)
            
            if floor_stops.present?
              stops_points = fetch_stops_points(floor_stops)
              # sorted_points = sort_stops_by_distance(starting_point, stops_points)
              sorted_points = sort_stops_by_previous_point(starting_point, stops_points)
              
              if sorted_points.present?
                puts "Sorted Points #{f}, #{b}: \n\n"
                puts sorted_points.inspect
                puts "\n\n\n\n"

                current_point = sorted_points.last
                current_point = get_elevator(b, f, current_point) #sorted_points.last
                
                puts "Current Point #{f}, #{b}: \n\n"
                puts current_point.inspect
                puts "\n\n\n\n"

                sorted_stops = fetch_sorted_tour_stops(sorted_points)

                update_hash(b, f, sorted_stops)

                sorted_stops.each_with_index do |stop, index|
                  g_index = (g_index + index + 1)
                  stop.update_column(:sort, g_index)
                end
              end
            end
          end
        else
          current_point =  get_elevator(b, f, current_point)
        end

      end
    end

  end

  def update_hash b, f, sorted_stops
    @tour.sort_hash["#{b},#{f}"] = sorted_stops&.pluck(:id)&.map(&:to_s)
    @tour.save!
  end
  
  def get_elevator(b, f, current_point)
    begin
      elevators = @community&.elevators&.where(building: b)&.select do |elevator|
        floors_covering_range = get_floors_covering_range(elevator&.floorplate_covering_range)
        
        if f === floors.last
          floors_covering_range.include?(f)
        else
          floors_covering_range.include?(f) && f != floors_covering_range.last
        end
      end 

      elevators&.min_by { |elevator| distance(current_point, elevator) }

    rescue => error
      puts "Elevator sorting error  #{f}, #{b}: #{error.message}"
    end
  end
  

  def get_floors_covering_range range_string
    if range_string.include?('-')
      start_num, end_num = range_string.split('-').map(&:to_i)
      (start_num..end_num).to_a
    else
      [range_string.to_i]
    end
  end

  def update_stops_sorting_order(sorted_stops)
    sorted_stops.each_with_index do |stop, index|
      stop.update_column(:sort, ( index+1 )  )
    end
  end

  def fetch_stops_points(tour_stops)
    tour_stops.each_with_object([]) do |tour_stop, points|
      actual_stop = fetch_actual_stop(tour_stop)
  
      next unless actual_stop.present?
  
      if @community.is_sitemap || (actual_stop.floor.present? && actual_stop.building.present?)
        points << build_stop_point(tour_stop, actual_stop)
      end
    end
  end
  

  def fetch_actual_stop(tour_stop)
    tour_stop[:stop_type].classify.constantize.find_by(id: tour_stop[:stop_id])
    
  rescue StandardError => e
    Rails.logger.error("Error fetching stop: #{e.message}")
    nil
  end

  def build_stop_point(tour_stop, actual_stop)
    {
      id: tour_stop[:id],
      stop_type: tour_stop[:stop_type],
      stop_id: tour_stop[:stop_id],
      x_plot: actual_stop&.x_plot,
      y_plot: actual_stop&.y_plot
    }
  end

  def sort_stops_by_distance(starting_point, stops_list)
    stops_list.sort_by { |stop| distance(starting_point, stop) }
  end

  def fetch_sorted_tour_stops(tour_stops_list)
    tour_stops_list.map { |stop| get_tour_stops.where(id: stop[:id])&.last }&.compact
  end

  def distance(point1, point2)
    Math.sqrt((point1[:x_plot] - point2[:x_plot])**2 + (point1[:y_plot] - point2[:y_plot])**2)
  end

  def get_tour_stops
    ids = @tour.tour_stops.ids - @community.deleted_ids
    @tour.tour_stops.where(id: ids, stop_type: ["unit", "amenity"]).plotted_stops.visible
  end

  def get_floor_stops stop_ids
    get_tour_stops.where(id: stop_ids)
  end

  def get_tour
    if @community.customization_enabled? 
      CustomizeTourService.new(@community, @tour_user).get_user_tour
    else
      @community.community_tour
    end
  end

  def sitemap_starting_point
    @community.community_tour
  end

  def floors
    Floors.new(@community).get_community_floors
  end

  def buildings
    Buildings.new(@community).get_community_buildings
  end
end
