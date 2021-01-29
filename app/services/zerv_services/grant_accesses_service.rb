module ZervServices
    class GrantAccessesService < ZervServices::BaseService
  
        def execute(args)
            community    = args[:community]
            tour_user    = args[:tour_user]
            stop_list    = args[:stop_list]

            is_user_exists = false
            response = ZervServices::GetUsersService.call(community: community)
            if response.success?
                if response.payload["listUsers"].length == 0
                    ################################### first zerv user ever ###################################
                    response = ZervServices::AddUserWithAccessesService.call(community: community, tour_user: tour_user, stop_list: stop_list)
                    check_response(community, tour_user, stop_list, response, {manual_error: "AddUserWithAccessesService responsed false", error_position: "at creating first user ever in zerv portal"})
                else
                    response.payload["listUsers"].each do |zerv_user|
                        tour_user.phone_number[0] = '' unless is_number?(tour_user.phone_number[0])
                        if zerv_user["phoneNumber"] == tour_user.phone_number
                            ################################## if user exists get previous data also #####################################
                            response = ZervServices::GetUserWithAccessesService.call(community: community, tour_user: tour_user)
                            if response.success? 
                                response = ZervServices::UpdateUserWithAccessesService.call(community: community, tour_user: tour_user, stop_list: stop_list, zerv_user: response.payload)
                                check_response(community, tour_user, stop_list, response, {manual_error: "UpdateUserWithAccessesService responsed false", error_position: "at updating zerv user"})
                            else
                                create_zerv_guest__failure(community, tour_user, response.error.merge(manual_error: "GetUserWithAccessesService responsed false", error_position: "user exists but at gettingUserAccesses thorwing error"))
                            end
                            is_user_exists = true
                        end
                    end

                    unless is_user_exists
                        ################################## creating zerv user #####################################
                        response = ZervServices::AddUserWithAccessesService.call(community: community, tour_user: tour_user, stop_list: stop_list)
                        check_response(community, tour_user, stop_list, response, {manual_error: "AddUserWithAccessesService responsed false", error_position: "at creating zerv user"})
                    end

                end
            else
                create_zerv_guest__failure(community, tour_user, response.error.merge(manual_error: "GetUsersService responsed false", error_position: "at geting all users list from zerv"))
            end
        end

        def check_response(community, tour_user, stop_list, response, errors)
            if response.success?
                create_zerv_guest__success(community, tour_user, stop_list)
            else
                create_zerv_guest__failure(community, tour_user, response.error.merge(errors))
            end
        end
        
        def create_zerv_guest__success(community, tour_user, stop_list)
            puts '--------------------------    Zerv guest created successfully    ------------------------'
            ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
            if stop_list.present?
                stop_list.each do |stop|
                    stop.zerv_guests.create(community_id: community.id, tour_user_id: tour_user.id, status: "active") if stop.zerv_locks.last.present?
                end
            else
                ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active")
            end
            Rails.cache.delete(:id_token)
        end

        def create_zerv_guest__failure(community, tour_user, errors)
            puts '--------------------------    Failure in creating Zerv User      ------------------------'
            ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
            ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active", res_errors: errors)
            Rails.cache.delete(:id_token)
        end

        def is_number? string
            true if Float(string) rescue false
        end
    end
end