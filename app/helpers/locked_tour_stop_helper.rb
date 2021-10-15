module LockedTourStopHelper
  def get_door_or_stop_lock stop, lock_provider
    binding.pry
    unless stop.is_a?(Tour)
      tour_stop = stop.stop_type.classify.constantize.find_by_id stop.stop_id

      new_stop = tour_stop

      if tour_stop.class.name === "Amenity"
        if tour_stop.present? && tour_stop.doors.present? && tour_stop.doors.last.lock_provider === lock_provider
          new_stop = tour_stop.doors.last
        end

      elsif tour_stop.class.name === "Unit"
        if tour_stop.present? && tour_stop.door.present? && tour_stop.door.lock_provider === lock_provider
          new_stop = tour_stop.door
        end
      end

      new_stop
    else
      stop
    end
  end

end