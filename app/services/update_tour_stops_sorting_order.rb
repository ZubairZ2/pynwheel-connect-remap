class UpdateTourStopsSortingOrder
  def initialize(community, tour_user, stop_ids)
    @community = community
    @tour_user = tour_user
    @tour = get_tour
    @ignore_stop_ids = stop_ids
    puts "******"*30
    puts "\n\n"
    puts @ignore_stop_ids.inspect
    puts "\n\n"
    puts "******"*30
  end

  def sort
    @community.is_sitemap ? sort_sitemap_stops : sort_floorplate_stops
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
      doors = amenity.doors

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
  
  def get_building_starting_point
  end

  def sort_single_building_floorplate_stops
    g_index = 1
    current_point = sitemap_starting_point

    buildings&.each do |b|
      # bsp = get_building_starting_point()
      floors&.each_with_index do |f, f_index|
        floor_stop_ids = @tour&.sort_hash["#{b},#{f}"]

        if floor_stop_ids.present?
          starting_point = f_index > 0 ? get_elevator(b, f, current_point) : sitemap_starting_point # for the first floor use tour as starting point
          floor_stops = get_floor_stops(floor_stop_ids)
          stops_points = fetch_stops_points(floor_stops)
          # sorted_points = sort_stops_by_distance(starting_point, stops_points)
          sorted_points = sort_stops_by_previous_point(starting_point, stops_points)

          puts "Sorted Points: \n\n"
          puts sorted_points.inspect
          puts "\n\n\n\n"

          current_point = sorted_points.last
          current_point = get_elevator(b, f, current_point) #sorted_points.last
          puts "Current Point: \n\n"
          puts current_point.inspect
          puts "\n\n\n\n"

          sorted_stops = fetch_sorted_tour_stops(sorted_points)

          if sorted_stops.present?
            update_hash(b, f, sorted_stops)

            sorted_stops.each_with_index do |stop, index|
              g_index = (g_index + index + 1)
              stop.update_column(:sort, g_index)
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
      puts "Elevator sorting error: #{error.message}"
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
  
      next unless actual_stop
  
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
    ids = @tour.tour_stops.ids - @ignore_stop_ids
    @tour.tour_stops.where(id: ids).plotted_stops.visible
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
