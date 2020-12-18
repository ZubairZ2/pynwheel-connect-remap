module SalesforceServices
    class TourFeedback < BaseService

        def execute(args)
            community = args[:community]
            tour_user = args[:tour_user]

            url = base_url + "/tourFeedback"
            token = get_access_token
            binding.pry
            if token.success?
                auth_header = "Bearer " + token.payload["access_token"]
                c_time_zone = get_community_time_zone(community)

                begin
                    arrival_time = tour_user.arrived.in_time_zone(c_time_zone)
                    if tour_user.is_left and tour_user.active_app
                        end_time = tour_user.left.in_time_zone(c_time_zone)
                        abandoned_tour_at = ""
                    elsif !tour_user.is_left and !tour_user.active_app
                        tour_stop = TourStop.find_by_id tour_user.abandoned_tour_at_stop
                        abandoned_tour_at =  tour_stop.present? ?  (tour_stop.stop_type.classify.constantize.find_by_id tour_stop.stop_id).name rescue "" : ""
                        end_time = tour_user.lengthy_stay.in_time_zone(c_time_zone)
                    else
                        end_time = Time.now.in_time_zone(c_time_zone)
                        abandoned_tour_at = ""
                    end
                    tour_length = (arrival_time - end_time).ceil
                rescue => exception
                    begin
                        end_time = Time.now.in_time_zone(c_time_zone)
                    rescue => exception
                        arrival_time = tour_user.arrived    # utc
                        end_time = Time.now.utc             # utc
                    end
                    abandoned_tour_at = ""
                    tour_length = (arrival_time - end_time).ceil
                end

                sf_user = Prospect.find_by(community_id: community.id, tour_user_id: tour_user.id, crm_provider: "salesforce", sf_status: "active")
                sf_user.tour_key = "21a2459376670d13b083765319cdaaff" # testing line
                stops_visited = VisitedStop.where(tour_id: community.tour.id, tour_user_id: tour_user.id, tour_key: sf_user.tour_key).pluck(:tour_stop_id).uniq
                binding.pry
                
                stops_detail_for_sf = []
                stops_visited.each do |stop_id|
                    binding.pry
                    stop = TourStop.find_by_id stop_id
                    begin
                        stop_detail = Hash.new
                        stop_detail[:stopId] = stop.stop_id
                        stop_detail[:stopName] = stop.name.present? ? stop.name : ((stop.stop_type.classify.constantize.find_by_id stop.stop_id).name rescue "")
                        
                        if tour_key.present?
                            stop_detail[:notes] = VisitedStop.where(tour_id: community.tour.id, tour_user_id: tour_user.id, tour_key: sf_user.tour_key, tour_stop_id: stop_id).pluck(:description).compact
                            stop_detail[:photos] = VisitedStop.where(tour_id: community.tour.id, tour_user_id: tour_user.id, tour_key: sf_user.tour_key, tour_stop_id: stop_id).pluck(:image).compact.count
                            stop_detail[:chatHistory] = ""
                        else
                            stop_detail[:notes] = []
                            stop_detail[:photos] = 0
                            stop_detail[:chatHistory] = ""
                        end
                        
                    rescue => exception
                        next
                    else
                        stops_detail_for_sf << stop_detail
                    end
                end
                
                binding.pry
                begin
                    response = HTTParty.post(url,
                        body: {
                            "bookingId": sf_user.sf_booking_id,
                            "bookingName": sf_user.sf_booking_name,
                            "guestId": sf_user.sf_guest_id,
                            "guestEmail":  tour_user.email,
                            "propertyName": community.name,
                            "activityData": {
                                "type": tour_user.tour_status,
                                "timeFrom": arrival_time,
                                "timeTo": end_time,
                                "tourLength": tour_length,
                                "abandonedTourAt": abandoned_tour_at,
                                "visitedStops": stops_detail_for_sf
                            }
                        }.to_json,
                        :headers => { 'Authorization' => auth_header,
                                    'Content-Type' => 'application/json' }
                    )
                rescue HTTParty::Error => e
                    OpenStruct.new({success?: false, error: e, payload: nil})
                else
                    unless response[:errorCode].present?
                        OpenStruct.new({success?: true, error: nil, payload: response})
                    else
                        OpenStruct.new({success?: false, error: response, payload: nil})
                    end
                end

            else
                token # its already a OpenStruct
            end
        end

    end
end