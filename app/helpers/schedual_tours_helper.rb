module SchedualToursHelper
  def get_user_tour_stops (community, tour_user)
    if community.present? && community.tour.present?
        community.tour.tour_stops.order(:sort)
    else
      []
    end
  end

  def is_visible tour_user, stop
    if tour_user.present? && tour_user.stops_list.present?
      tour_user.stops_list.include?(stop.id)
    else
      stop.display_stop
    end
  end

  def is_tour_customized(tour_user)
    if tour_user.present? && tour_user.stops_list.present?
      true
    else
      false
    end
  end

  def scheduled_tour_date_time tour
    tour.present? ? tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p") : ""
  end

  def tour_user_name tour_user
    tour_user.first_name.present? ? (tour_user.first_name + " " + tour_user.last_name) : tour_user.name
  end

  def schedule_tour_url community, community_code
    "#{root_url}scheduler_widget/test_widget?community_id=#{community.id}&community_code=#{community_code}&schedual_tours_page=true&direct=true"
  end

  def reschedule_tour tour, community, community_code
    "#{root_url}scheduler/change_schedule_tour_time/#{tour.id}?datetime=#{scheduled_tour_date_time(tour)}"
  end

  def is_tour_in_future tour
    (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")) > Time.now
  end

  def get_visible_tour_stops(community, tour_user)
    if tour_user.present? && tour_user.stops_list.present?
      community.tour.tour_stops.where(id: tour_user.stops_list).pluck(:id)
    else
      community.tour.tour_stops.where(display_stop: true).pluck(:id)
    end

  end

end