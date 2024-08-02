module AllowedTourStopsHelper
  def igloohome_allowed_stops(community, tour_user, allowed_stops = [])
    visible_stops = CustomizeTourService.new(community, tour_user).available_stops

    visible_stops.each do |stop|
      tour_stop = (stop[0].classify.constantize.find_by_id stop[1])

     unless tour_stop.class.name === "Amenity" || tour_stop.class.name === "Unit"
      if tour_stop.lock_provider == "Igloohome"
        allowed_stops << tour_stop.id
      end
     end

      if tour_stop.class.name === "Amenity" && ( tour_stop.lock_provider == "Igloohome" || (tour_stop.ordered_doors.present? && tour_stop.ordered_doors.first.lock_provider === "Igloohome") )
        if tour_stop.present? && tour_stop.ordered_doors.present? && tour_stop.ordered_doors.first.lock_provider === "Igloohome"
          allowed_stops << tour_stop.ordered_doors.first.id
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
      

    allowed_stops << community.community_tour.id if community.community_tour.lock_provider == "Igloohome"
    
    allowed_stops
  end
end