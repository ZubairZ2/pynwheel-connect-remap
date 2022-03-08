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
      @tour_user.tours.where(community_id: @community&.id).last
    else
      @community.community_tour
    end
  end

  private

  def is_customization_enabled
    @community.community_tour&.tour_setting&.enable_tour_customization
  end
end