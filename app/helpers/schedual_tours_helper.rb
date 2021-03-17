module SchedualToursHelper
  def get_user_tour_stops (community, tour_user)
    if community.present? && community.tour.present?
        community.tour.tour_stops.order(:sort)
    else
      []
    end
  end

  def stop_should_be_visible stop 
    if stop.stop_type === "elevator" || stop.stop_type === "building_starting_point"
      false
    else
      true
    end
  end

  def get_building(stop, community)
    if community.is_sitemap || stop.stop_type === "building_starting_point" || stop.stop_type === "elevator"
      "-"
    else
      new_stop = stop.stop_type.classify.constantize.find_by_id stop.stop_id
      new_stop.building.present? ? new_stop.building : "-"
    end
  end

  def get_floor(stop, community)
    if community.is_sitemap || stop.stop_type === "building_starting_point" || stop.stop_type === "elevator"
      "-"
    else
      new_stop = stop.stop_type.classify.constantize.find_by_id stop.stop_id
      new_stop.floor.present? ? new_stop.floor : "-"
    end
  end

  def is_visible tour, stop
    if tour.present? && tour.stops_list.present?
      tour.stops_list.include?(stop.id)
    else
      stop.display_stop
    end
  end

  def is_tour_customized(tour)
    if tour.present? && tour.stops_list.present?
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

  def is_tour_in_future(community, tour, timezone = nil)
    if community.present? && community.latitude.present? && community.longitude.present?
      timezone = get_time_zone(community)
    end

    timezone = timezone || tour.user_time_zone

    (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone) > Time.now.in_time_zone(timezone)

  end

  def get_time_zone(community)
    time_zone = Timezone.lookup(community.latitude, community.longitude)
    timezone = time_zone.name
  end

  def get_visible_tour_stops(community, tour)
    if tour.present? && tour.stops_list.present?
      community.tour.tour_stops.where(id: tour.stops_list).pluck(:id)
    else
      community.tour.tour_stops.where(display_stop: true).pluck(:id)
    end

  end

end