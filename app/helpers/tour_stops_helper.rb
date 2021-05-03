module TourStopsHelper
  def fetch_removing_stops_sub_location(tour_stops_ids, community)
    sub_location_name_arr = []
    tour_stops = TourStop.where(id: tour_stops_ids)
    stops_ids = tour_stops.map{|ts| [ts.stop_type, ts.stop_id ]}
    zerv_locks = community.zerv&.zerv_locks
    if zerv_locks.present?
      stops_ids.each do |stop|
        if ((stop[0].classify.constantize).find stop[1]).lock_provider == "Zerv"
          sub_location_name_arr << zerv_locks.where(stop_type: stop[0].capitalize,stop_id: stop[1]).last.sub_location_name
        end
      end
    end
    sub_location_name_arr
  end
end
