module ZervServices
    class LoginService < BaseService

        def execute(test_conn)
            url = "https://api.zervinc.net/v1/portal/login"
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