module ZervServices
    class AddUserWithAccessesService < ZervServices::BaseService

        def execute(args)
            community = args[:community]
            tour_user = args[:tour_user]
            stop_list = args[:stop_list]
            
            url = base_url + "/user/adduserwithtimezone"
            id_token = get_id_token

            list_add_user_access = []
            if stop_list.present?
                timezone = get_community_time_zone(community)
                tour_time = Time.now.in_time_zone(timezone)
                stop_list.each do |stop|
                    attached_lock = stop.zerv_locks.last
                    access_code = attached_lock.universal_access_code.present? ? attached_lock.universal_access_code : nil rescue nil
                    access_point = attached_lock.mac_id rescue nil
                    if access_point.present?
                        list_add_user_access << time_access_object(community, tour_time)
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
                "image": nil,
                "listAddUserAccess": list_add_user_access
            }
            
            puts '--------------------------    Zerv Adding user with accesses called    ------------------------'
            puts body.to_json
            puts "-----------------------------------------------------------------------------------------------"

            response = HTTParty.post(url,
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


        def time_access_object(community, tour_time)
            # ------------------------------------ set values for zerv access parameters ----------------------------- #
            
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

            req_keys = {
                "id": "0",
                "userAccessDurationId": "0",
                "accessStartDate": tour_time.strftime("%Y-%m-%d"),
                "accessEndDate": (tour_time + 1.day).strftime("%Y-%m-%d"),
                "credentialIdentifier": "1234",
                "facilityId": nil,
                "active": true,
                "monAccess": false,
                "tueAccess": false,
                "wedAccess": false,
                "thuAccess": false,
                "friAccess": false,
                "satAccess": false,
                "sunAccess": false,
                "mon_access_start_time": "00:00",
                "mon_access_end_time": "00:00",
                "tue_access_start_time": "00:00",
                "tue_access_end_time": "00:00",
                "wed_access_start_time": "00:00",
                "wed_access_end_time": "00:00",
                "thu_access_start_time": "00:00",
                "thu_access_end_time": "00:00",
                "fri_access_start_time": "00:00",
                "fri_access_end_time": "00:00",
                "sat_access_start_time": "00:00",
                "sat_access_end_time": "00:00",
                "sun_access_start_time": "00:00",
                "sun_access_end_time": "00:00",
            }
    
            # below line will replace the main_keys within the required_keys
            req_keys.merge(main) 
        end
    end
end