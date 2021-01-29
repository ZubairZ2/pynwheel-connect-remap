module ZervServices
    class GetUserWithAccessesService < ZervServices::BaseService

        def execute(args)
            tour_user = args[:tour_user]
            tour_user.phone_number[0] = '' unless is_number?(tour_user.phone_number[0])

            url =  base_url + "/user/getuserwithtimezone/" + tour_user.phone_number + "?customerId=PynWheel-jKOOe"
            id_token = get_id_token

            puts '--------------------------    Zerv get user with accesses called    ------------------------'
            response = HTTParty.get(url,
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

        def is_number? string
            true if Float(string) rescue false
        end
    end
end