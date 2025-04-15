module SalesforceServices
  class TourFeedback < SalesforceServices::BaseService

    def execute(args)
      community = args[:community]
      tour_user = args[:tour_user]
      tour_history = args[:tour_history]

      url = base_url + "/tourFeedback"
      token = get_access_token
      
      if token.success?
        auth_header = "Bearer " + token.payload["access_token"]
        c_time_zone = community.get_time_zone()

        begin
          arrival_time = tour_history.arrived.in_time_zone(c_time_zone)
          if tour_history.is_left and tour_history.active_app
            end_time = tour_history.left.in_time_zone(c_time_zone)
            abandoned_tour_at = ""
          elsif !tour_history.is_left and !tour_history.active_app
            tour_stop = TourStop.find_by_id tour_history.abandoned_tour_at_stop
            abandoned_tour_at =  tour_stop.present? ?  (tour_stop.stop_type.classify.constantize.find_by_id tour_stop.stop_id).name : ""  rescue ""
            end_time = tour_history.lengthy_stay.in_time_zone(c_time_zone)
          else
            end_time = Time.now.in_time_zone(c_time_zone)
            abandoned_tour_at = ""
          end

          tour_length = (end_time - arrival_time).ceil.abs
        rescue => exception
          begin
            end_time = Time.now.in_time_zone(c_time_zone)
          rescue => exception
            arrival_time = tour_history.arrived
            end_time = Time.now.utc
          end
          
          abandoned_tour_at = ""
          tour_length = (end_time - arrival_time).ceil.abs
        end

        sf_user = Prospect.find_by(community_id: community.id, tour_user_id: tour_user.id, crm_provider: "salesforce", sf_status: "active")

          if sf_user.present?
            show_chat_only_in_first_stop = true
            stops_visited = VisitedStop.where(tour_id: community.community_tour.id, tour_user_id: tour_user.id, tour_key: sf_user.tour_key).pluck(:tour_stop_id).uniq

            stops_detail_for_sf = []
            stops_visited.each do |stop_id|
              stop = TourStop.find_by_id stop_id
              begin
                stop_detail = Hash.new
                stop_detail[:stopId] = stop.stop_id
                stop_detail[:stopName] = stop.name.present? ? stop.name : ((stop.stop_type.classify.constantize.find_by_id stop.stop_id).name rescue "")
                stop_detail[:notes] = VisitedStop.where(tour_id: community.community_tour.id, tour_user_id: tour_user.id, tour_key: sf_user.tour_key, tour_stop_id: stop_id).pluck(:description).compact
                stop_detail[:photos] = VisitedStop.where(tour_id: community.community_tour.id, tour_user_id: tour_user.id, tour_key: sf_user.tour_key, tour_stop_id: stop_id).pluck(:image).compact.count
                
                if show_chat_only_in_first_stop == true
                  stop_detail[:chatHistory] = Chatroom.find_by(tour_id: community.community_tour.id, tour_user_id: tour_user.id).chats.where(tour_key: sf_user.tour_key).order(:id).map{|c| (c.name == "Support Team" ? ("Support:" + c.message + " :: ") : ("User:" + c.message + " :: "))}.flatten.join("") rescue ""
                  show_chat_only_in_first_stop = false
                else
                  stop_detail[:chatHistory] = ""
                end
                
              rescue => exception
                next
              else
                stops_detail_for_sf << stop_detail
              end
            end

              begin
                body = {
                  "bookingId": sf_user.sf_booking_id,
                  "bookingName": sf_user.sf_booking_name,
                  "guestId": sf_user.sf_guest_id,
                  "guestEmail":  tour_user.email,
                  "propertyName": community.name,
                  "activityData": {
                    "type": tour_user.tour_type,
                    "timeFrom": arrival_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    "timeTo": end_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    "tourLength": tour_length,
                    "abandonedTourAt": abandoned_tour_at,
                    "visitedStops": stops_detail_for_sf
                  }
                }

                response = HTTParty.post(url,
                  body: body.to_json,
                  :headers => { 'Authorization' => auth_header,
                              'Content-Type' => 'application/json' }
                )


                sf_user.update(sf_status: "deleted", data: response.merge(feedback: body))

              rescue HTTParty::Error => e
                OpenStruct.new({success?: false, error: e, payload: nil})
              else
                if response.code == "200" or response.code == 200
                  OpenStruct.new({success?: true, error: nil, payload: response})
                else
                  OpenStruct.new({success?: false, error: response, payload: nil})
                end
              end
          end
      else
        token
      end
    end

  end
end