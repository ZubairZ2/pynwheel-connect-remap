class RemoteLockService < BaseService
      
    def initialize(community,user)
        @edge_state_user = EdgeState.find_by(community_id: community.id, user_id: user.id)
    end
    
    def client_credentials
        if @edge_state_user.present?
            auth_url = "https://connect.remotelock.com/oauth/token"
            response = HTTParty.post(auth_url,
                body: {
                    client_id: @edge_state_user.client_id,
                    client_secret: @edge_state_user.client_secret,
                    grant_type: "client_credentials"
                },
                headers: { 'Content-Type' => 'application/x-www-form-urlencoded' } )

            puts '==='*50
            puts response["access_token"]
            puts '==='*50
            return response["access_token"]
        end
    end

    def get_deivces(access_token)
        if @edge_state_user.present?
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = base_url + "/devices"
            
            response = HTTParty.get(url,
                :headers => { 'Authorization' => auth_header,
                                'Accept' => 'application/vnd.lockstate+json; version=1' } )

            # return response
        end
    end

    def update_db
        response["data"].each do |device|
            type = device["type"]
            name = device["attributes"]["name"]
            serial_number = device["attributes"]["serial_number"]
            device_id = device["id"]
            self_link = device["links"]["self"]
            
        end
    end

    def base_url
        "https://api.remotelock.com"
    end
end