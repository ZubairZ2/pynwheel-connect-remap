module ZervServices
    class UpdateUserWithAccessesService < ZervServices::BaseService

        def execute(args)
            community    = args[:community]
            tour_user    = args[:tour_user]
            stop_list    = args[:stop_list]
            zerv_user    = args[:zerv_user]
            is_resident = args[:is_resident]
            
            @facilityId   = community.zerv.facility_id.blank? ? "0" : community.zerv.facility_id
            @accessCode   = community.zerv.badge_id.blank? ? "1234" : community.zerv.badge_id
            @cardFormat   = community.zerv.card_format.blank? ? "HID Prox 26-bit H10301" : community.zerv.card_format

            user_audit_logs = ZervServices::GetAuditLogsService.call(community: community) 
            user_audit_logs = user_audit_logs.success? ? user_audit_logs["payload"]["listUserAudit"] : nil
            user_accesses = zerv_user["listGetUserAccess"]

            url = base_url + "/user/updateuserandtimezone/" + zerv_user["id"].to_s
            id_token = get_id_token

            list_add_user_access = []
            if stop_list.present?
                timezone = community.get_time_zone()
                tour_time = Time.now.in_time_zone(timezone)
                stop_list.each do |stop|
                    attached_lock = stop.zerv_locks.last
                    access_code = attached_lock.universal_access_code.present? ? attached_lock.universal_access_code : nil rescue nil
                    access_point = attached_lock.mac_id rescue nil

                    if access_point.present?
                        update_user_access_time(community, tour_user, user_audit_logs, access_point, stop) if is_resident

                        if user_accesses.blank?
                            list_add_user_access << time_access_object(community, tour_time, nil, is_resident)
                        else
                            previous_access = user_accesses.find_all{ |access| access["accessPoint"] == access_point }
                            if previous_access.blank?
                                list_add_user_access << time_access_object(community, tour_time, nil, is_resident)
                            else
                                list_add_user_access << time_access_object(community, tour_time, previous_access, is_resident)
                            end
                        end
                        list_add_user_access.last.merge!({"accessCode": @accessCode,"accessPoint": access_point})
                    end
                end
            end
            
            unless is_resident
                tour_user.phone_number = tour_user.phone_number[0] == '+' ?  tour_user.phone_number : '+' + tour_user.phone_number
            end

            body = {
                "firstName": tour_user.first_name,
                "lastName": tour_user.last_name,
                "phoneNumber":  tour_user.phone_number,
                "email": tour_user.email,
                "id": zerv_user["id"],
                "image": nil,
                "cardFormat": @cardFormat,
                "facilityId": @facilityId,
                "accessCode": @accessCode,
                "addressAndRelationship": true,
                "refreshCredentialFrequency": 24,
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
            puts url
            puts "***"*50
            puts response
        rescue HTTParty::Error => e
            OpenStruct.new({success?: false, error: e, payload: nil})
        else
            if response["code"] == "200" and response["status"] == "success"
                OpenStruct.new({success?: true, error: nil, payload: response})
            else
                OpenStruct.new({success?: false, error: response, payload: nil})  
            end
        end

        def update_user_access_time community, pynwheel_access_user, logs, mac_id, stop
            access_points = pynwheel_access_user.resident_access_points.where(access_point_id: stop.id, access_point_type: stop.class.name.camelize(:lower))

            if mac_id && access_points.present?
                access_log = stop_access_time(community, pynwheel_access_user, logs, mac_id)

                if access_log.present? 
                    if access_log["event"] === "Successfully accessed the device."
                        access_points.update_all(access_time: access_log["eventTimestamp"].to_datetime, is_accessed: true)
                    else
                        access_points.update_all(access_time: access_log["eventTimestamp"].to_datetime, is_accessed: false)
                    end
                end
            end
        end

        def stop_access_time community, pynwheel_access_user, logs, mac_id, access_log_entries = []
            location_name = (community.company.name + ' - ' + community.name).downcase.parameterize.gsub("-", "").gsub("_", "")
            community_logs = logs.map{|log| log if log["locationName"].present? && log["locationName"].downcase.parameterize.gsub("-", "").gsub("_", "") == location_name}.compact

            community_logs.each do |log|
                if log["phoneNumber"].to_s === pynwheel_access_user.phone_number[1..-1] && log["deviceMACId"] === mac_id
                    access_log_entries << log
                end
            end

            latest_access_time(access_log_entries)
        end

        def latest_access_time access_log_entries, max_date = nil, max_date_log = nil
            if access_log_entries.present?
                max_date = access_log_entries[0]["eventTimestamp"].to_datetime
                max_date_log = access_log_entries[0]

                access_log_entries.each do |log|
                    if max_date < log["eventTimestamp"].to_datetime
                        max_date = log["eventTimestamp"].to_datetime
                        max_date_log = log
                    end
                end

            end
            
            max_date_log
        end

        def time_access_object(community, tour_time, prev_access, is_resident)
            # ------------------------------------ set values for zerv access parameters ----------------------------- #
            prev_access = prev_access[0] if prev_access.present?
            start_time = tour_time.strftime("%H:%M")
            end_time = (tour_time + 90.minutes).strftime("%H:%M")

            if is_resident
                start_time = "00:00"
                end_time = "23:59"
            end

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
                id = 0
                userAccessDurationId = 0
            else
                id = prev_access["id"].to_i
                userAccessDurationId = prev_access["userAccessDurationId"].to_i
            end

            req_keys = {
                "id": id,
                "userAccessDurationId": userAccessDurationId,
                "accessStartDate": tour_time.strftime("%Y-%m-%d"),
                "accessEndDate": (tour_time + 1.day).strftime("%Y-%m-%d"),
                "credentialIdentifier": "1234",
                "facilityId": @facilityId,
                "cardFormat": @cardFormat,
                "antiPassBack": 5,
                "range": 100,
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