module ZervServices
    class AddUserWithAccessesService < BaseService
        def self.call(*args, &block)
            request_data = args[0]
            new(request_data[:community]).execute(request_data[:community], request_data[:tour_user], request_data[:stop_list])
        end

        def execute(community, tour_user, stop_list)
            url = "https://api.zervinc.net/v1/portal/user/adduserwithtimezone"
            id_token = get_id_token

            list_add_user_access = []
            if stop_list.present?
                tour_time = Time.now
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
            # sleep 10
            response = HTTParty.post(url,
                body: {
                        "firstName": tour_user.first_name,
                        "lastName": tour_user.last_name,
                        "phoneNumber":  tour_user.phone_number,
                        "email": tour_user.email,
                        "listAddUserAccess": list_add_user_access
                }.to_json,
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
    
            req_keys = {
                "accessEndDate": tour_time.strftime("%Y-%m-%d"),
                "accessStartDate": tour_time.strftime("%Y-%m-%d"),
                "credentialIdentifier": "",
                "facilityId": "",
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
    
        def get_community_time_zone(community)
            tz = Ziptz.new
            timezone = nil
        
            if community.zip.present?
                timezone = tz.time_zone_name(community.zip)
            end
        
            if timezone.nil? and community.latitude.present? and community.longitude.present?
                time_zone = Timezone.lookup(community.latitude, community.longitude)
                timezone = time_zone.name
            end
        rescue
            return nil
        else
            return timezone
        end

    end
end