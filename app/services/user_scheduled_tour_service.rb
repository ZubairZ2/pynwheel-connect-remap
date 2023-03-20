class UserScheduledTourService < BaseService

  def initialize tour_user, community
    @tour_user = tour_user
    @community = community
  end

  def get_scheduled_tour_in_future
    scheduled_tours = @community.schedual_tours.where(tour_user_id: @tour_user.id, is_tour_completed: false, property_tour_type: "scheduled_tour")
    
    if scheduled_tours.present?
      filter_tour_with_max_date_time(scheduled_tours)
    else
      nil
    end

  end

  private

  def filter_tour_with_max_date_time scheduled_tours, timezone = nil
    scheduled_tour = scheduled_tours.first
    
    timezone = @community.get_time_zone()
    max_date = scheduled_tour_date_time(scheduled_tour, timezone)

    scheduled_tours.each do |tour|
      timezone = timezone || scheduled_tour.user_time_zone 
      tour_date = scheduled_tour_date_time(tour, timezone)

      if max_date <  tour_date
        max_date  = tour_date
        scheduled_tour = tour
      end if (max_date && tour_date).present?
    end

    check_within_grace_period = max_date + (@community.community_tour.grace_period).minutes
    
    if max_date.present? && scheduled_tour.present? && check_within_grace_period > Time.now.in_time_zone(timezone)
      SchedualTour.where(id: scheduled_tour.id)
    else
      []
    end

  end

  def scheduled_tour_date_time tour, timezone
    tour.present? ? (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone) : "" if (tour.tour_date && tour.tour_time).present?
  end
end