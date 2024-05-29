class SortedTourStopsList
  def initialize(tour_stops, community, tour)
    @tour_stops = tour_stops
    @community = community
    @tour = tour
  end

  def get_sorted_stops_list
    @community.is_sitemap ? sitemap_sorted_stops_list : floorplate_sorted_stops_list
  end

  private

  def sitemap_sorted_stops_list
    stops_points = fetch_stops_points
    sorted_points = sort_stops_by_distance(get_starting_point, stops_points)
    fetch_sorted_tour_stops(sorted_points)
  end

  def floorplate_sorted_stops_list
    @tour_stops
  end

  def fetch_stops_points
    make_stops_hash.map do |tour_stop|
      actual_stop = fetch_actual_stop(tour_stop)
      build_stop_point(tour_stop, actual_stop)
    end
  end

  def fetch_sorted_tour_stops(tour_stops_list)
    tour_stops_list.map { |stop| TourStop.find(stop[:id]) }
  end

  def make_stops_hash
    @tour_stops.map { |stop| stop.slice(:id, :stop_type, :stop_id) }
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

  def get_starting_point
    { x_plot: @tour.x_plot, y_plot: @tour.y_plot }
  end

  def sort_stops_by_distance(starting_point, stops_list)
    stops_list.sort_by { |stop| euclidean_distance(starting_point, stop) }
  end

  def euclidean_distance(point1, point2)
    Math.sqrt((point1[:x_plot] - point2[:x_plot])**2 + (point1[:y_plot] - point2[:y_plot])**2)
  end
end
