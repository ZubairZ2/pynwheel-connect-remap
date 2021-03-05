module SchedualToursHelper
  def get_user_tour_stops (community, tour_user_id)
    if community.present?
      customized_tour = community.user_customized_tours.find_by(tour_user_id: tour_user_id, community_id: community.id) if community.user_customized_tours.present?

      if customized_tour.present? && customized_tour.tour.present?
        customized_tour.tour.tour_stops.order(:sort)
      else
        community.tour.tour_stops.order(:sort)
      end
    else
      []
    end
  end

  def is_tour_customized(community_id, tour_user_id)
    user_customized_tour = UserCustomizedTour.find_by(community_id: community_id, tour_user_id: tour_user_id)
    
    (user_customized_tour.present? && user_customized_tour.tour.present?) ? true : false
  end

  def scheduled_tour_date_time tour
    tour.present? ? tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p") : ""
  end

  def tour_user_name tour_user
    tour_user.first_name.present? ? (tour_user.first_name + " " + tour_user.last_name) : tour_user.name
  end

  def schedule_tour_url(community, community_code)
    "#{root_url}scheduler_widget/test_widget?community_id=#{community.id}&community_code=#{community_code}&schedual_tours_page=true&direct=true"
  end

  def reschedule_tour(tour, community, community_code)
    "#{root_url}scheduler/change_schedule_tour_time/#{tour.id}?datetime=#{scheduled_tour_date_time(tour)}"
  end

  def is_tour_in_future tour
    (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")) > Time.now
  end

end