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

    def get_all_deivces(access_token)
        if @edge_state_user.present?
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = base_url + "/devices"
            
            response = HTTParty.get(url,
                :headers => { 'Authorization' => auth_header,
                              'Accept' => 'application/vnd.lockstate+json; version=1' } )
            
            puts "---"*50
            puts response
            puts "---"*50

            return response
        end
    end

    def get_device(access_token,device_id)
        if @edge_state_user.present?
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = base_url + "/devices/" + device_id 
            
            response = HTTParty.get(url,
                :headers => { 'Authorization' => auth_header,
                              'Accept' => 'application/vnd.lockstate+json; version=1' } )
           
            puts "---"*50
            puts response
            puts "---"*50
            
            return response
        end
    end

    def update_device(access_token,device_id,updated_device_data)
        if @edge_state_user.present?
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = base_url + "/devices/" + device_id 
            
            response = HTTParty.put(url,
                body: {
                    attributes: {
                        name: updated_device_data.name
                    }
                }.to_json,
                :headers => { 'Authorization' => auth_header,
                              'Accept' => 'application/vnd.lockstate+json; version=1',
                              'Content-Type' => 'application/json'} )
            puts "---"*50
            puts response
            puts "---"*50
 
            return response
        end
    end

    def create_access_guest(access_token,tour_user)
        if @edge_state_user.present?
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = base_url + "/access_persons"
            
            response = HTTParty.post(url,
                body: {
                    type: "access_guest",
                    attributes: {
                        name: tour_user.name,
                        email: tour_user.email,
                        phone: tour_user.phone_number,
                        starts_at: DateTime.now.iso8601.split('+')[0],
                        ends_at: DateTime.now.end_of_day.iso8601.split('+')[0],
                        generate_pin: true
                    }
                }.to_json,
                :headers => { 'Authorization' => auth_header,
                                'Accept' => 'application/vnd.lockstate+json; version=1',
                                'Content-Type' => 'application/json' } )

            puts "---"*50
            puts response
            puts "---"*50

            return response
        end
    end
    
    def grant_access(access_token, access_person_id, accessible_id,accessible_type)
        if @edge_state_user.present?
            token_type = "Bearer"
            auth_header = token_type + " " + access_token

            url = base_url + "/access_persons/#{access_person_id}/accesses"

            response = HTTParty.post(url,
                body: {
                    attributes: {
                        "accessible_id": accessible_id,
                        "accessible_type": accessible_type
                    }
                }.to_json,
                :headers => { 'Authorization' => auth_header,
                                'Accept' => 'application/vnd.lockstate+json; version=1',
                                'Content-Type' => 'application/json' } )
            
            puts "---"*50
            puts response
            puts "---"*50

            return response
        end
    end

    def update_deivces_in_db(responce)
        if @edge_state_user.present?
            devices = responce["data"]
            devices.each do |device|
                type = device["type"]
                name = device["attributes"]["name"]
                serial_number = device["attributes"]["serial_number"]
                device_id = device["id"]

                rml = RemoteLock.find_by(device_id: device_id)
                if rml.nil?
                    RemoteLock.create(device_id: device_id, remote_lock_type: type, name: name, edge_state_id: @edge_state_user.id)
                elsif rml.remote_lock_type != type  or rml.name != name
                    rml.update_attributes(remote_lock_type: type, name: name)
                end
            end
        end
    end

    def base_url
        "https://api.remotelock.com"
    end
end