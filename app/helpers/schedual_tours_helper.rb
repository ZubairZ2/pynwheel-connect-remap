module SchedualToursHelper
  def get_user_tour_stops (community)
    if community.present? && community.tour.present?
      tour_stops = community.tour.tour_stops
      unit_ids = tour_stops.where(stop_type: "unit").pluck(:stop_id) 
      non_available_stops = unit_ids.present? ? Unit.where(id: unit_ids, available: false).ids : []
      tour_stops.where.not(stop_id: non_available_stops).order(:sort)
      # unit_ids = TourStop.joins(:tour).where("tour_stops.stop_type =? AND tours.community_id =?", "unit", community.id).pluck(:stop_id)
      # TourStop.includes(:tour).where("tours.community_id  =? AND stop_id !=?", community.id, non_available_stops).references(:tours).order(:sort)
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
      (new_stop.present? && new_stop.building.present?) ? new_stop.building : "-"
    end
  end

  def get_floor(stop, community)
    if community.is_sitemap || stop.stop_type === "building_starting_point" || stop.stop_type === "elevator"
      "-"
    else
      new_stop = stop.stop_type.classify.constantize.find_by_id stop.stop_id
      (new_stop.present? && new_stop.floor.present?) ? new_stop.floor : "-"
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

  def schedule_tour_of_user community, community_code, tour_user_id
    "#{root_url}scheduler_widget/test_widget?community_id=#{community.id}&community_code=#{community_code}&tour_user_id=#{tour_user_id}&schedual_tours_page=true&direct=true"
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
    tour_stops = community.tour.tour_stops
    if tour.present? && tour.stops_list.present?
      tour_stops.where(id: tour.stops_list).pluck(:id)
    else
      stop_ids = tour_stops.where(display_stop: true).where.not(stop_type: "building_starting_point").where.not(stop_type: "elevator").pluck(:id)
      unit_stops_ids = tour_stops.where(id: stop_ids, stop_type: "unit").pluck(:stop_id)
      ids_list = Unit.where(id: unit_stops_ids, available: false).pluck(:id)

      stop_ids - TourStop.where(stop_id: ids_list).pluck(:id)
    end

  end

end