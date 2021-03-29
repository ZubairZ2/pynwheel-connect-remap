module ZervServices
    class GetUserWithAccessesService < ZervServices::BaseService

        def execute(args)
            tour_user = args[:tour_user]
            check_again = args[:checking_twice].present? ? true : false
            tour_user.phone_number[0] = '' unless is_number?(tour_user.phone_number[0])

            url =  base_url + "/user/getuserwithtimezone/" + tour_user.phone_number + "?customerId=PynWheel-jKOOe"
            id_token = get_id_token

            puts '--------------------------    Zerv get user with accesses called    ------------------------'
            response = HTTParty.get(url,
                headers: { 'Authorization' => id_token, 'Content-Type' => 'application/json'})
            puts url
            puts "***"*50
            puts response
        rescue HTTParty::Error => e
            OpenStruct.new({success?: false, error: e, payload: nil})
        else
            if response["code"] == "200" and response["status"] == "success"
                unless check_again
                    OpenStruct.new({success?: true, error: nil, payload: response})
                else
                    community = args[:community]
                    stop_list = args[:stop_list]
                    manual_error = response.success? ? {} : {manual_error: "AddUserWithAccessesService responsed false", error_position: "Error: #{response.error.code} => Phone number does not exists"}
                    check_response(community, tour_user, stop_list, response, manual_error)
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