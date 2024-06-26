class SortedTourStopsList
  def initialize(tour_stops, community, tour)
    @tour_stops = tour_stops
    @community = community
    @tour = tour
    @original_stops = []
  end

  def get_sorted_stops_list
    @community.is_sitemap ? sitemap_sorted_stops_list : floorplate_sorted_stops_list
  end

  private

  def sitemap_sorted_stops_list
    starting_point = get_starting_point(@tour)
    index = 0
  
    while index < @tour_stops.length
      if @tour_stops[index].is_a?(TourStop)
        unit_or_amenity_stops = []
        
        while index < (@tour_stops.length) && @tour_stops[index].is_a?(TourStop) && ["unit", "amenity"].include?(@tour_stops[index].stop_type)
          unit_or_amenity_stops << @tour_stops[index]
          index += 1
        end

        
        if unit_or_amenity_stops.present?
          stops_points = fetch_stops_points(unit_or_amenity_stops)
          sorted_points = sort_stops_by_distance(starting_point, stops_points)
          stops = fetch_sorted_tour_stops(sorted_points)

          stops.each do |s|
            @original_stops << s
          end
        end

      else
        starting_point = get_starting_point(@tour_stops[index])
        @original_stops << @tour_stops[index]
        index += 1
      end
    end
    @original_stops
  end

  def floorplate_sorted_stops_list
    starting_point = get_starting_point(@tour)
    index = 0
  
    while index < @tour_stops.length
      if @tour_stops[index].is_a?(TourStop)
        if ["elevator", "building_starting_point"].include?(@tour_stops[index].stop_type)
          actual_stop = fetch_actual_stop(@tour_stops[index])
          starting_point = get_starting_point(actual_stop)
          @original_stops << @tour_stops[index]
          index += 1
        else
          unit_or_amenity_stops = []

          while index < @tour_stops.length && ["unit", "amenity"].include?(@tour_stops[index].stop_type)
            unit_or_amenity_stops << @tour_stops[index]
            index += 1
          end

          if unit_or_amenity_stops.present?
            stops_points = fetch_stops_points(unit_or_amenity_stops)
            sorted_points = sort_stops_by_distance(starting_point, stops_points)
            stops = fetch_sorted_tour_stops(sorted_points)

            stops.each do |s|
              @original_stops << s
            end

          end
        end
      else
        starting_point = get_starting_point(@tour_stops[index])
        @original_stops << @tour_stops[index]
        index += 1
      end
    end

    @original_stops
  end
  
  def fetch_stops_points tour_stops
    make_stops_hash(tour_stops).map do |tour_stop|
      actual_stop = fetch_actual_stop(tour_stop)
      build_stop_point(tour_stop, actual_stop)
    end
  end

  def fetch_sorted_tour_stops(tour_stops_list)
    tour_stops_list.map { |stop| TourStop.find(stop[:id]) }
  end

  def make_stops_hash tour_stops
    tour_stops.map { |stop| stop.slice(:id, :stop_type, :stop_id) }
  end

  def fetch_actual_stop(tour_stop)
    tour_stop[:stop_type].classify.constantize.find_by_id(tour_stop[:stop_id])
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

  def get_starting_point startin_point
    { x_plot: startin_point.x_plot, y_plot: startin_point.y_plot }
  end

  def sort_stops_by_distance(starting_point, stops_list)
    stops_list.sort_by { |stop| euclidean_distance(starting_point, stop) }
  end

  def euclidean_distance(point1, point2)
    Math.sqrt((point1[:x_plot] - point2[:x_plot])**2 + (point1[:y_plot] - point2[:y_plot])**2)
  end
end
