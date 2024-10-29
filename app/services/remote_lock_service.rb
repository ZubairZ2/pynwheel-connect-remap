class RemoteLockService < BaseService
      
  def initialize(community)
    @edge_state_user = EdgeState.find_by(community_id: community.id)
  end
    
  def client_credentials
    if @edge_state_user.present?
      auth_url = "#{ENV['REMOTELOCK_AUTH_BASE_URL']}/oauth/token"

      response = HTTParty.post(auth_url,
        body: {
          client_id: @edge_state_user.client_id,
          client_secret: @edge_state_user.client_secret,
          grant_type: "client_credentials"
        },
        headers: { 'Content-Type' => 'application/x-www-form-urlencoded' } )

      return response["access_token"]
    end
  end

  def code_grant_authorization(code)
    if code.present?
      auth_url = "#{ENV['REMOTELOCK_AUTH_BASE_URL']}/oauth/token"
      body = {
        code: code,
        client_id: ENV['REMOTELOCK_CLIENT_ID'],
        client_secret: ENV['REMOTELOCK_SECRET'],
        redirect_uri: ENV['REMOTELOCK_REDIRECT_URI'],
        grant_type: 'authorization_code'
      }

      response = HTTParty.post(auth_url, body: body, headers: { 'Content-Type' => 'application/x-www-form-urlencoded' })

      return response
    end
  end

  def get_access_token_after_refresh
    if @edge_state_user.present?
      auth_url = "#{ENV['REMOTELOCK_AUTH_BASE_URL']}/oauth/token"
      body = {
        client_id: ENV['REMOTELOCK_CLIENT_ID'],
        client_secret: ENV['REMOTELOCK_SECRET'],
        refresh_token: @edge_state_user.refresh_token,
        grant_type: 'refresh_token'
      }
      
      response = HTTParty.post(auth_url, body: body, headers: { 'Content-Type' => 'application/x-www-form-urlencoded' })
      
      @edge_state_user.update_attributes(refresh_token: response['refresh_token']) if response['refresh_token'].present?

      return response["access_token"]
    end
  end

  def get_all_deivces(access_token)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/devices"
      
      response = HTTParty.get(url, :headers => { 'Authorization' => auth_header, 'Accept' => 'application/vnd.lockstate+json; version=1' } )
      
      return response
    end
  end

  def get_device(access_token,device_id)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/devices/" + device_id 
      
      response = HTTParty.get(url, :headers => { 'Authorization' => auth_header, 'Accept' => 'application/vnd.lockstate+json; version=1' } )
      
      return response
    end
  end

  def update_device(access_token,device_id,updated_device_data)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/devices/" + device_id 
      
      response = HTTParty.put(  url,
                                body: { attributes: { name: updated_device_data.name } }.to_json,
                                :headers => { 
                                  'Authorization' => auth_header,
                                  'Accept' => 'application/vnd.lockstate+json; version=1',
                                  'Content-Type' => 'application/json'
                                } 
                              )

      return response
    end
  end

  def create_access_guest(access_token,tour_user,current_time)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/access_persons"

      if current_time.to_s.count('-') == 2
        start_time = current_time.iso8601.split('+')[0]
        ends_time = (current_time + 90.minutes).iso8601.split('+')[0]
      elsif current_time.to_s.count('-') == 3
        char_pos = current_time.iso8601.to_s.rindex('-')
        index = char_pos - 1
        start_time = current_time.iso8601.to_s.slice(0..index)
        ends_time = (current_time + 90.minutes).iso8601.to_s.slice(0..index)
      end
      
      response = HTTParty.post(url,
        body: {
          type: "access_guest",
          attributes: {
            name: tour_user.name,
            email: tour_user.email,
            phone: '+' + SecureRandom.rand(99999999999).to_s,  
            starts_at: start_time,
            ends_at: ends_time,
            generate_pin: true
          }
        }.to_json,
        :headers => { 
          'Authorization' => auth_header,
          'Accept' => 'application/vnd.lockstate+json; version=1',
          'Content-Type' => 'application/json' 
        }
      )

      return response
    end
  end
  
  def get_access_guest(access_token,guest_id)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/access_persons/" + guest_id 
      
      response = HTTParty.get(  url,
                                :headers => { 
                                  'Authorization' => auth_header,
                                  'Accept' => 'application/vnd.lockstate+json; version=1' 
                                } 
                              )
      return response
    end
  end

  def delete_access_guest(access_token,guest_id)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/access_persons/" + guest_id 
      
      response = HTTParty.delete( url,
                                  :headers => { 
                                    'Authorization' => auth_header,
                                    'Accept' => 'application/vnd.lockstate+json; version=1',
                                    'Content-Type' => 'application/json' 
                                  } 
                                )
      return response
    end
  end

  def update_access_guest(access_token,guest_id,tour_user)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/access_persons/" + guest_id 
      
      response = HTTParty.put(url,
        body: {
          attributes: {
            name: tour_user.name,
            email: tour_user.email,
            phone: tour_user.phone_number,
            starts_at: DateTime.now.iso8601.split('+')[0],
            ends_at: DateTime.now.end_of_day.iso8601.split('+')[0],
            generate_pin: true
          }
        }.to_json,
        :headers => { 
          'Authorization' => auth_header,
          'Accept' => 'application/vnd.lockstate+json; version=1' ,
          'Content-Type' => 'application/json'
        } 
      )
      
      return response
    end
  end

  def grant_access(access_token, access_person_id, accessible_id,accessible_type)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/access_persons/#{access_person_id}/accesses"

      response = HTTParty.post(url,
        body: {
          attributes: {
            "accessible_id": accessible_id,
            "accessible_type": accessible_type
          }
        }.to_json,
        :headers => { 
          'Authorization' => auth_header,
          'Accept' => 'application/vnd.lockstate+json; version=1',
          'Content-Type' => 'application/json' 
        } 
      )

      return response
    end
  end

  def get_all_events(access_token,page)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = page > 1 ? base_url + "/events/?page="+ page.to_s : base_url + "/events" 
      
      response = HTTParty.get(url, :headers => { 'Authorization' => auth_header} )

      return response
    end
  end

  def get_dwelo_events(access_token,guest_id)
    @dwelo_user = Dwelo.first
    
    if @dwelo_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/v4/integrations/pynwheel/events/?access_person_id=" + guest_id
      response = HTTParty.get(url, :headers => { 'Authorization' => auth_header} )

      return response
    end
  end

  def create_igloo_guests(access_token,tour_user,igloo_lock_id,current_time)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/igloo_guests"

      body = {
        type: "igloo_guest",
        attributes: {
          igloo_lock_id: igloo_lock_id,
          name: tour_user.name,
          email: tour_user.email,
          starts_at: current_time.strftime("%Y-%m-%dT%H:%M:%S"),
          ends_at: (current_time + 1.5.hours).strftime("%Y-%m-%dT%H:%M:%S"),
        }
      }.to_json

      response = HTTParty.post(url,
        body: body,
        :headers => { 
          'Authorization' => auth_header,
          'Accept' => 'application/vnd.lockstate+json; version=1',
          'Content-Type' => 'application/json' 
        } 
      )

      return response
    end
  end

  def delete_igloo_guests(access_token,igloo_guest_id)
    if @edge_state_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token rescue ''
      url = base_url + "/igloo_guests/" + igloo_guest_id    

      response = HTTParty.delete(url,
        :headers => { 
          'Authorization' => auth_header,
          'Accept' => 'application/vnd.lockstate+json; version=1',
          'Content-Type' => 'application/json' 
        } 
      )

      return response
    end
  end

  def update_deivces_in_db(responce)
    if @edge_state_user.present?
      available_ids = []
      devices = responce["data"]

      devices.each do |device|
        type = device["type"]
        name = device["attributes"]["name"]
        serial_number = device["attributes"]["serial_number"]
        device_id = device["id"]

        rml = RemoteLock.find_by(device_id: device_id, edge_state_id: @edge_state_user.id)
        if rml.nil?
          rml = RemoteLock.create(device_id: device_id, remote_lock_type: type, name: name, edge_state_id: @edge_state_user.id)
        elsif rml.remote_lock_type != type  or rml.name != name
          rml.update_attributes(remote_lock_type: type, name: name)
        end

        available_ids << rml.id
      end

      RemoteLock.where(edge_state_id: @edge_state_user.id).where.not(id: available_ids).delete_all
    end
  end

  def base_url
    "https://api.remotelock.com"
  end
end