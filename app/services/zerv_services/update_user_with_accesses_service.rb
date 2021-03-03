module ZervServices
    class UpdateUserWithAccessesService < ZervServices::BaseService

        def execute(args)
            community    = args[:community]
            tour_user    = args[:tour_user]
            stop_list    = args[:stop_list]
            zerv_user    = args[:zerv_user]
            user_accesses = zerv_user["listGetUserAccess"]

            url = base_url + "/user/updateuserandtimezone/" + zerv_user["id"].to_s
            id_token = get_id_token

            list_add_user_access = []
            if stop_list.present?
                timezone = get_community_time_zone(community)
                tour_time = Time.now.in_time_zone(timezone)
                stop_list.each do |stop|
                    attached_lock = stop.zerv_locks.last
                    access_code = attached_lock.universal_access_code.present? ? attached_lock.universal_access_code : "" rescue ""
                    access_point = attached_lock.mac_id rescue nil
                    if access_point.present?
                        if user_accesses.blank?
                            list_add_user_access << time_access_object(community, tour_time, nil)
                        else
                            previous_access = user_accesses.find_all{ |access| access["accessPoint"] == access_point }
                            if previous_access.blank?
                                list_add_user_access << time_access_object(community, tour_time, nil)
                            else
                                list_add_user_access << time_access_object(community, tour_time, previous_access)
                            end
                        end
                        list_add_user_access.last.merge!({"accessCode": access_code,"accessPoint": access_point})
                    end
                end
            end
            
            tour_user.phone_number = tour_user.phone_number[0] == '+' ?  tour_user.phone_number : '+' + tour_user.phone_number
            body = {
                "firstName": tour_user.first_name,
                "lastName": tour_user.last_name,
                "phoneNumber":  tour_user.phone_number,
                "email": tour_user.email,
                "id": zerv_user["id"],
                "image": "",
                "removeExistingAccessDuration": [],
                "removedExistingAccess": [],
                "listAddUserAccess": list_add_user_access
            }
            
            puts '--------------------------  Zerv Updating user with accesses called    ------------------------'
            puts body.to_json
            puts "-----------------------------------------------------------------------------------------------"

            response = HTTParty.put(url,
                body: body.to_json,
                headers: { 'Authorization' => id_token, 'Content-Type' => 'application/json'})

        rescue HTTParty::Error => e
            OpenStruct.new({success?: false, error: e, payload: nil})
        else
            if response["code"] == "200" and response["status"] == "success"
                OpenStruct.new({success?: true, error: nil, payload: response})
            else
                OpenStruct.new({success?: false, error: response, payload: nil})  
            end
        end


        def time_access_object(community, tour_time, prev_access)
            # ------------------------------------ set values for zerv access parameters ----------------------------- #
            prev_access = prev_access[0] if prev_access.present?
            start_time = tour_time.strftime("%H:%M")
            end_time = (tour_time + 90.minutes).strftime("%H:%M")
            
            if tour_time.monday?
                main = {
                    "monAccess": true,
                    "mon_access_start_time": start_time,
                    "mon_access_end_time": end_time,
                }
            elsif tour_time.tuesday?
                main = {
                    "tueAccess": true,
                    "tue_access_start_time": start_time,
                    "tue_access_end_time": end_time,
                }
            elsif tour_time.wednesday?
                main = {
                    "wedAccess": true,
                    "wed_access_start_time": start_time,
                    "wed_access_end_time": end_time,
                }
            elsif tour_time.thursday?
                main = {
                    "thuAccess": true,
                    "thu_access_start_time": start_time,
                    "thu_access_end_time": end_time,
                }
            elsif tour_time.friday?
                main = {
                    "friAccess": true,
                    "fri_access_start_time": start_time,
                    "fri_access_end_time": end_time,
                }
            elsif tour_time.saturday?
                main = {
                    "satAccess": true,
                    "sat_access_start_time": start_time,
                    "sat_access_end_time": end_time,
                }
            elsif tour_time.sunday?
                main = {
                    "sunAccess": true,
                    "sun_access_start_time": start_time,
                    "sun_access_end_time": end_time,
                }
            end

            if prev_access.nil?
                id = "0"
                userAccessDurationId = "0"
            else
                id = prev_access["id"].to_s
                userAccessDurationId = prev_access["userAccessDurationId"].to_s
            end

            req_keys = {
                "id": id,
                "userAccessDurationId": userAccessDurationId,
                "accessStartDate": tour_time.strftime("%Y-%m-%d"),
                "accessEndDate": (tour_time + 1.day).strftime("%Y-%m-%d"),
                "credentialIdentifier": "1234",
                "facilityId": "",
                "active": true,
                "monAccess": false,
                "tueAccess": false,
                "wedAccess": false,
                "thuAccess": false,
                "friAccess": false,
                "satAccess": false,
                "sunAccess": false,
                "mon_access_end_time": "00:00",
                "mon_access_start_time": "00:00",
                "tue_access_end_time": "00:00",
                "tue_access_start_time": "00:00",
                "wed_access_end_time": "00:00",
                "wed_access_start_time": "00:00",
                "thu_access_end_time": "00:00",
                "thu_access_start_time": "00:00",
                "fri_access_end_time": "00:00",
                "fri_access_start_time": "00:00",
                "sat_access_end_time": "00:00",
                "sat_access_start_time": "00:00",
                "sun_access_end_time": "00:00",
                "sun_access_start_time": "00:00",
            }
    
            # below line will replace the main_keys within the required_keys
            req_keys.merge(main) 
        end
    end
end