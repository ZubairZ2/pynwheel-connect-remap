module ZervServices
  class GrantAccessesService < ZervServices::BaseService

    def execute(args)
      community    = args[:community]
      tour_user    = args[:tour_user]
      stop_list    = args[:stop_list]
      is_resident  = args[:is_resident]
      is_user_exists = false
      response = ZervServices::GetUsersService.call(community: community)
      number = get_user_phone_number(is_resident, tour_user)

      if response.success?
        if response.payload["listUsers"].length == 0
          response = ZervServices::AddUserWithAccessesService.call(is_resident: is_resident, community: community, tour_user: tour_user, stop_list: stop_list)
          check_response(is_resident, community, tour_user, stop_list, response, response.error.present? ? {manual_error: "AddUserWithAccessesService responsed false", error_position: "Error: #{response.error.code} :: Unable to create Zerv user"} : {})
        else
          response.payload["listUsers"].each do |zerv_user|
            if zerv_user["phoneNumber"] == number
              response = ZervServices::GetUserWithAccessesService.call(is_resident: is_resident, community: community, tour_user: tour_user, customer_id: zerv_user["customerId"])
              
              if response.success? 
                response = ZervServices::UpdateUserWithAccessesService.call(is_resident: is_resident, community: community, tour_user: tour_user, stop_list: stop_list, zerv_user: response.payload)
                check_response(is_resident, community, tour_user, stop_list, response, response.error.present? ? {manual_error: "UpdateUserWithAccessesService responsed false", error_position: "Error: #{response.error.code} :: Unable to update Zerv user"} : {})
              else
                create_zerv_guest__failure(community, tour_user, response.error.merge(manual_error: "GetUserWithAccessesService responsed false", error_position: "Error: #{response.error.code} :: Unable to create Zerv user"))
              end

              is_user_exists = true
            end
          end

          unless is_user_exists
            response = ZervServices::AddUserWithAccessesService.call(community: community, tour_user: tour_user, stop_list: stop_list)
            check_response(is_resident, community, tour_user, stop_list, response, response.error.present? ? {manual_error: "AddUserWithAccessesService responsed false", error_position: "Error: #{response.error.code} :: Unable to create Zerv user"} : {})
          end

        end
      else
        create_zerv_guest__failure(community, tour_user, response.error.merge(manual_error: "GetUsersService responsed false", error_position: "Error: #{response.error.code} :: Unable to retrieve the list of zerv users"))
      end
    end

    def get_user_phone_number is_resident, user, number = nil
      if is_resident
        number = uer.phone_number[1..-1]
      else
        user.phone_number[0] = '' unless is_number?(user.phone_number[0])
        number = user.phone_number
      end
    end

    def is_number? string
      true if Float(string) rescue false
    end
  end
end