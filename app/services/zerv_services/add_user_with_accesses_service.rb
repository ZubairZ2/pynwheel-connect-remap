module ZervServices
    class AddUserWithAccessesService < ZervServices::BaseService
        def self.call(*args, &block)
            request_data = args[0]
            new(request_data[:community]).execute(request_data[:community], request_data[:tour_user], request_data[:stop_list])
        end

        def execute(community, tour_user, stop_list)
            url = "https://api.zervinc.net/v1/portal/user/adduserwithtimezone"
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
            
            puts "############3 ------------- ###################"
            puts body.to_json
            puts "############3 ------------- ###################"

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
                    "mon_access_end_time": start_time,
                    "mon_access_start_time": end_time,
                }
            elsif tour_time.tuesday?
                main = {
                    "tueAccess": true,
                    "tue_access_end_time": start_time,
                    "tue_access_start_time": end_time,
                }
            elsif tour_time.wednesday?
                main = {
                    "wedAccess": true,
                    "wed_access_end_time": start_time,
                    "wed_access_start_time": end_time,
                }
            elsif tour_time.thursday?
                main = {
                    "thuAccess": true,
                    "thu_access_end_time": start_time,
                    "thu_access_start_time": end_time,
                }
            elsif tour_time.friday?
                main = {
                    "friAccess": true,
                    "fri_access_end_time": start_time,
                    "fri_access_start_time": end_time,
                }
            elsif tour_time.saturday?
                main = {
                    "satAccess": true,
                    "sat_access_end_time": start_time,
                    "sat_access_start_time": end_time,
                }
            elsif tour_time.sunday?
                main = {
                    "sunAccess": true,
                    "sun_access_end_time": start_time,
                    "sun_access_start_time": end_time,
                }
            end

            # ask about "id" and "userAccessDurationId" values from zerv
            req_keys = {
                "accessEndDate": tour_time.strftime("%Y-%m-%d"),
                "accessStartDate": tour_time.strftime("%Y-%m-%d"),
                "credentialIdentifier": "1234",
                "facilityId": nil,
                "monAccess": false,
                "tueAccess": false,
                "wedAccess": false,
                "thuAccess": false,
                "friAccess": false,
                "satAccess": false,
                "sunAccess": false,
                "mon_access_end_time": "",
                "mon_access_start_time": "",
                "tue_access_end_time": "",
                "tue_access_start_time": "",
                "wed_access_end_time": "",
                "wed_access_start_time": "",
                "thu_access_end_time": "",
                "thu_access_start_time": "",
                "fri_access_end_time": "",
                "fri_access_start_time": "",
                "sat_access_end_time": "",
                "sat_access_start_time": "",
                "sun_access_end_time": "",
                "sun_access_start_time": "",
            }
    
            # below line will replace the main_keys within the required_keys
            req_keys.merge(main) 
        end
    end
end