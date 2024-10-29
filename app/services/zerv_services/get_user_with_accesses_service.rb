module ZervServices
  class GetUserWithAccessesService < ZervServices::BaseService

    def execute(args)
      tour_user = args[:tour_user]
      check_again = args[:checking_twice].present? ? true : false
      is_resident = args[:is_resident]
      community = args[:community]
      customer_id = args[:customer_id]
      
      number = get_user_phone_number(is_resident, tour_user)

      url = "#{base_url}/user/getuserwithtimezone/#{number}?customerId=#{customer_id}"
      id_token = get_id_token

      response = HTTParty.get(url,
        headers: { 'Authorization' => id_token, 'Content-Type' => 'application/json'})

    rescue HTTParty::Error => e
      OpenStruct.new({success?: false, error: e, payload: nil})
    else
      if response["code"] == "200"  
        unless check_again
          OpenStruct.new({success?: true, error: nil, payload: response})
        else
          community = args[:community]
          stop_list = args[:stop_list]
          is_resident = args[:is_resident]
          manual_error = response.success? ? {} : {manual_error: "AddUserWithAccessesService responsed false", error_position: "Error: #{response.error.code} => Phone number does not exists"}
          check_response(is_resident, community, tour_user, stop_list, response, manual_error)
        end
      else
        OpenStruct.new({success?: false, error: response, payload: nil})  
      end
    end

    def get_user_phone_number is_resident, user, number = nil
      if is_resident
        number = user.phone_number[1..-1]
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