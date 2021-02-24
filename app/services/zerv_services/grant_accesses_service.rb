module ZervServices
    class GrantAccessesService < ZervServices::BaseService
        def self.call(*args, &block)
            request_data = args[0]
            new(request_data[:community]).perform(request_data[:community], request_data[:tour_user], request_data[:stop_list])
        end
  
        def perform(community, tour_user, stop_list)
            response = ZervServices::GetUsersService.call(community: community)
            if response.success?
                if response.payload["listUsers"].length == 0
                    ################################### first zerv user ever ###################################
                    response = ZervServices::AddUserWithAccessesService.call(community: community, tour_user: tour_user, stop_list: stop_list)
                    check_response(community, tour_user, stop_list, response, {manual_error: "AddUserWithAccessesService responsed false", error_position: "at creating first user ever in zerv portal"})
                else
                    delele_user_response = nil
                    response.payload["listUsers"].each do |zerv_user|
                        tour_user.phone_number[0] = '' unless is_number?(tour_user.phone_number[0])
                        if zerv_user["phoneNumber"] == tour_user.phone_number
                            ################################### delete and create again zerv user ###################################
                            # for updating user we have to get a lot of data, the way zerv api's works
                            response = ZervServices::DeleteUserService.call(community: community, tour_user: tour_user)
                            delele_user_response = response.error.merge({deletion_error: "DeleteUserService responsed false"}) unless response.success?
                        end
                    end
                    ################################## creating zerv user #####################################
                    # don't check deletion reponse here, let's give it a try
                    response = ZervServices::AddUserWithAccessesService.call(community: community, tour_user: tour_user, stop_list: stop_list)
                    manual_errors = {manual_error: "AddUserWithAccessesService responsed false", error_position: "at creating zerv user"}
                    manual_errors = manual_errors.merge(delele_user_response) if delele_user_response.present?
                    check_response(community, tour_user, stop_list, response, manual_errors)
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
            ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
            if stop_list.present?
                stop_list.each do |stop|
                    stop.zerv_guests.create(community_id: community.id, tour_user_id: tour_user.id, status: "active") if stop.zerv_locks.last.present?
                end
            else
                ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active")
            end
        end

        def create_zerv_guest__failure(community, tour_user, errors)
            ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).update_all(status: "deleted")
            ZervGuest.create(community_id: community.id, tour_user_id: tour_user.id, status: "active", res_errors: errors)
        end

        def is_number? string
            true if Float(string) rescue false
        end
    end
end