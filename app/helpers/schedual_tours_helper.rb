module SchedualToursHelper
  def get_user_tour_stops (community)
    if community.present? && community.community_tour.present?
      tour_stops = community.community_tour.tour_stops.plotted_stops
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
    tour.present? ? tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p") : "" if (tour.tour_date && tour.tour_time).present? 
  end

  def unscheduled_tour_date_time(scheduled_tour,community)
    timezone = community.get_time_zone()
    scheduled_tour.is_tour_completed && scheduled_tour&.tour_completed_at.present? ? (scheduled_tour.tour_completed_at.in_time_zone(timezone)).strftime("%Y-%m-%d %I:%M%p") : (scheduled_tour.created_at.in_time_zone(timezone)).strftime("%Y-%m-%d %I:%M%p")
  end

  def scheduled_tour_type tour
    tour_type = tour.tour_type.split('_').map(&:capitalize).join(' ')

    property_tour_type = tour.property_tour_type == "scheduled_tour" ? tour_type : tour.property_tour_type.present? ? tour.property_tour_type.split('_').map(&:capitalize).join(' ') : tour_type 
    if property_tour_type == "Remote Tour" || tour_type == "Virtual tour"
      "Virtual Tour"
    elsif property_tour_type == "Unscheduled Self Tour"
      "App Guided Tour - Unscheduled"
    elsif property_tour_type == "Self Tour"  || tour_type == "Self guided"
      "App Guided Tour - Scheduled"
    else
      return "Person #{property_tour_type} - Scheduled"
    end
  end

  def confirmation_tour_second_card_title(title,property_tour_type,tour_type,id_verification,key,unsched_title)
    (property_tour_type == "unscheduled_self_tour" && !id_verification && key == 2) || (property_tour_type == "scheduled_tour" && tour_type == "self_tour" && !id_verification && key == 2) ? unsched_title : title
  end

  def confirmation_tour_second_card_text(text,property_tour_type,tour_type,id_verification,key,unsched_text)
    (property_tour_type == "unscheduled_self_tour" && !id_verification && key == 2) || (property_tour_type == "scheduled_tour" && tour_type == "self_tour" && !id_verification && key == 2) ? unsched_text : text
  end

  def tour_user_name tour_user
    tour_user.first_name.present? ? (tour_user.first_name + " " + tour_user.last_name) : tour_user.name
  end

  def schedule_tour_url community, community_code
    "#{root_url}scheduler_widget/test_widget?community_id=#{community.id}&community_code=#{community_code}&schedule_tours_page=true&direct=true"
  end

  #Remove it Once new flow is finalized
  # def reschedule_tour tour, community, community_code
  #   "#{root_url}scheduler/change_schedule_tour_time/#{tour.id}?datetime=#{scheduled_tour_date_time(tour)}?reschedule_tour=true"
  # end

  def get_schedule_tour_url community, tour, tour_user
    if tour.created_by != "salesforce" && tour.created_by != "PERQ"
      if (tour.is_tour_completed || !is_tour_in_future(community, tour))
        schedule_tour_of_user(tour, community, community.community_code(), tour_user.id)
      elsif is_tour_in_future(community, tour)
        reschedule_tour(tour, community, community.community_code(), tour_user.id)
      else
        ""
      end
    else
      ""
    end
  end

  def reschedule_tour tour, community, community_code, tour_user_id
    "#{root_url}scheduler_widget/test_widget?scheduled_tour_id=#{tour.id}&community_id=#{community.id}&tour_user_id=#{tour_user_id}&reschedule_tour=true&direct=true&community_code=#{community_code}"
  end

  def schedule_tour_of_user tour, community, community_code, tour_user_id
    "#{root_url}scheduler_widget/test_widget?community_id=#{community.id}&community_code=#{community_code}&tour_user_id=#{tour_user_id}&schedule_tour_id=#{tour.id}&schedule_tours_page=true&schedule_another_tour=true&direct=true"
  end
  

  def is_tour_in_future(community, tour, timezone = nil)
    timezone = community.get_time_zone()

    if (tour.tour_date && tour.tour_time).present?
      grace_period = tour&.community&.community_tour&.grace_period
      ( (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone) + grace_period.minutes ) > Time.now.in_time_zone(timezone)
    else
      return true
    end

  end

  def get_visible_tour_stops(community, tour)
    tour_stops = community.community_tour.tour_stops.plotted_stops
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