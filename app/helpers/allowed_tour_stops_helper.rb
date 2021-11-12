module AllowedTourStopsHelper
  def igloohome_allowed_stops(community, allowed_stops = [])
    visible_stops = community.tour.tour_stops.where(display_stop: true).pluck(:stop_type, :stop_id)

    visible_stops.each do |stop|
      tour_stop = (stop[0].classify.constantize.find_by_id stop[1])

     unless tour_stop.class.name === "Amenity" || tour_stop.class.name === "Unit"
      if tour_stop.lock_provider == "Igloohome"
        allowed_stops << tour_stop.id
      end
     end

      if tour_stop.class.name === "Amenity" && ( tour_stop.lock_provider == "Igloohome" || (tour_stop.doors.present? && tour_stop.doors.last.lock_provider === "Igloohome") )
        if tour_stop.present? && tour_stop.doors.present? && tour_stop.doors.last.lock_provider === "Igloohome"
          allowed_stops << tour_stop.doors.last.id
        else
          allowed_stops << tour_stop.id
        end
      end
        
      if tour_stop.class.name === "Unit" && ( tour_stop.lock_provider == "Igloohome" || (tour_stop.door.present? && tour_stop.door.lock_provider === "Igloohome") )
        if tour_stop.present? && tour_stop.door.present? && tour_stop.door.lock_provider === "Igloohome"
          allowed_stops << tour_stop.door.id
        else
          allowed_stops << tour_stop.id
        end
      end

    end
      

    allowed_stops << community.tour.id if community.tour.lock_provider == "Igloohome"
    
    allowed_stops
  end
end