class UpdateTourStopsSortingOrder
  def initialize(community, tour_user)
    @community = community
    @tour_user = tour_user
  end

  def sort
    @community.is_sitemap ? sort_sitemap_stops : sort_floorplate_stops
  end

  private

  def sort_sitemap_stops
    stops_points = fetch_stops_points(sitemap_stops)
    sorted_points = sort_stops_by_distance(sitemap_starting_point, stops_points)
    sorted_stops = fetch_sorted_tour_stops(sorted_points)
    update_stops_sorting_order(sorted_stops)
  end

  def sort_floorplate_stops
    # Implement the logic for sorting floorplate stops if needed
  end

  def update_stops_sorting_order(sorted_stops)
    sorted_stops.each_with_index do |stop, index|
      stop.update_column(:sort, index + 1)
    end
  end

  def fetch_stops_points(tour_stops)
    tour_stops.map do |tour_stop|
      actual_stop = fetch_actual_stop(tour_stop)
      build_stop_point(tour_stop, actual_stop) if actual_stop
    end.compact
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
    tour_stops_list.map { |stop| TourStop.find(stop[:id]) }
  end

  def distance(point1, point2)
    Math.sqrt((point1[:x_plot] - point2[:x_plot])**2 + (point1[:y_plot] - point2[:y_plot])**2)
  end

  def sitemap_stops
    tour.tour_stops
  end

  def tour
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
