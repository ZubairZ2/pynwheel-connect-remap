module ZervServices
  class LoginService < ZervServices::BaseService

    def execute(args)
      url = base_url + "/login"
      response = HTTParty.post(url,
        body: {
          username: @zerv.username,
          password: @zerv.password
        }.to_json,
        headers: { 'Content-Type' => 'application/json'})

    rescue HTTParty::Error => e
      OpenStruct.new({success?: false, error: e, payload: nil})
    else
      OpenStruct.new({success?: true, error: nil, payload: response})
    end

  end
end