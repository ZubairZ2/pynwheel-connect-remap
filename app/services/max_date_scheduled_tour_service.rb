class MaxDateScheduledTourService < BaseService
  def initialize(tour_user, community, flag)
    @tour_user_id = tour_user.id
    @community = community
    @flag = flag
  end

  def get_scheduled_tour
    scheduled_tours = @community.schedual_tours.where(tour_user_id: @tour_user_id)
    if scheduled_tours.present?
      filter_tour_with_max_date_time(scheduled_tours)
    else
      nil
    end
  end

  def filter_tour_with_max_date_time(scheduled_tours, timezone = nil)
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

    if @flag && max_date.present?
      max_date > Time.now.in_time_zone(timezone) ? scheduled_tour : nil
    else
      scheduled_tour
    end
  end

  def scheduled_tour_date_time(tour, timezone)
    tour.present? ? (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone) : "" if (tour.tour_date && tour.tour_time).present?
  end
end