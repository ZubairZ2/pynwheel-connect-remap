class CustomizeTourService
  def initialize community, tour_user
    @community = community
    @tour_user = tour_user
  end

  def available_stops
    tour = get_user_tour()
    tour.tour_stops.where(display_stop: true).pluck(:stop_type, :stop_id)
  end

  def get_user_tour
    if is_customization_enabled
      user_customized_tour
    else
      @community.community_tour
    end
  end

  def get_tour_sort_hash
    return if @community.sitemap

    if is_customization_enabled && user_customized_tour.present?
      customize_tour_sort_hash_with_elevators
    else
      @community.community_tour.sort_hash
    end

  end

  def customize_tour_sort_hash_with_elevators
    return if (@community.sitemap or !user_customized_tour.present? or !is_customization_enabled)
    
    tour = user_customized_tour
    tour_sort_hash = tour.sort_hash
    elevators = community_elevators

    elevators.each do |elevator|
      elevator_floor_range = elevator.floors
      building = elevator&.building rescue ""

      elevator_floor_range.each do |floor|
        selected_obj = tour_sort_hash["#{building},#{floor}"]
        if selected_obj.present?
          unless selected_obj.include?(elevator.id)
            stop = TourStop.where(stop_id:  elevator.id).last

            if stop.present?
              tour_sort_hash["#{building},#{floor}"] << stop.id
            end
          end
        end
      end
    end

    tour_sort_hash
  end

  private

  def community_elevators
    @community.elevators
  end

  def user_customized_tour
    @tour_user.tours.where(community_id: @community&.id).last    
  end

  def is_customization_enabled
    @community.community_tour&.tour_setting&.enable_tour_customization
  end
end