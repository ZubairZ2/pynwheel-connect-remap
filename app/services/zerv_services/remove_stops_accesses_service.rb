module ZervServices
    class RemoveStopsAccessesService < ZervServices::BaseService

        def execute(args)
            tour_user = args[:tour_user]
            community = args[:community]
            stop_list = args[:stop_list]
            removing_stops_sublocation_names = args[:removing_stops_arr]
            tour_user.phone_number[0] = '' unless is_number?(tour_user.phone_number[0])

            url =  base_url + "/user/getuserwithtimezone/" + tour_user.phone_number + "?customerId=PynWheel-TCXVx"
            id_token = get_id_token

            response1 = HTTParty.get(url,
                headers: { 'Authorization' => id_token, 'Content-Type' => 'application/json'})

        rescue HTTParty::Error => e
            OpenStruct.new({success?: false, error: e, payload: nil})
        else
            if response["code"] == "200" and response["status"] == "success"
              existing_access_ids = []
              existing_access_duration_ids = []
              response["listGetUserAccess"].each do |u|
                if (removing_stops_sublocation_names.include?(u["subLocation"]))
                  existing_access_ids << u["id"]
                  existing_access_duration_ids << u["userAccessDurationId"]
                end
              end
              if existing_access_ids.present? || existing_access_duration_ids.present?
                update_response = ZervServices::UpdateUserWithAccessesService.call(community: community, tour_user: tour_user, stop_list: stop_list, zerv_user: response, existing_access_ids: existing_access_ids, existing_access_duration_ids: existing_access_duration_ids)
                if update_response.success? 
                  puts "***"*50
                  puts " *************************   Remove Lock Response   ************************ "
                  puts update_response
                end
              end
            else
                OpenStruct.new({success?: false, error: response, payload: nil})  
            end
        end

        def is_number? string
            true if Float(string) rescue false
        end
    end
end