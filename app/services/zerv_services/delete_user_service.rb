module ZervServices
  class DeleteUserService < ZervServices::BaseService
    def self.call(*args, &block)
      request_data = args[0]
      new(request_data[:community]).execute(request_data[:community], request_data[:tour_user])
    end

    def execute(community, tour_user)
      tour_user.phone_number[0] = '' unless is_number?(tour_user.phone_number[0])
      url = "#{base_url}/user/deleteuser/#{tour_user.phone_number}"
      id_token = get_id_token
      
      response = HTTParty.delete(url,
        headers: { 'Authorization' => id_token, 'Content-Type' => 'application/json'})

    rescue HTTParty::Error => e
      OpenStruct.new({success?: false, error: e, payload: nil})
    else
      if response["code"] == "200"  
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