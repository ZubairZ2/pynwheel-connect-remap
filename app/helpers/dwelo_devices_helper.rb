module DweloDevicesHelper
  def dwelo_client_credentials
    @dwelo_user = Dwelo.find_by(community_id: params[:community_id])
    if @dwelo_user.present?
      auth_url = "https://api-sandbox.dwelo.com/v3/oauth/access_token"
      get_token_response = HTTParty.post(auth_url,
                                         body: {
                                             client_id: @dwelo_user.client_id,
                                             client_secret: @dwelo_user.client_secret,
                                             grant_type: "client_credentials"
                                         },
                                         headers: {'Content-Type' => 'application/x-www-form-urlencoded'})
      @token = get_token_response["access_token"]
    end
  end

  def update_dweloo_device(access_token, updated_device_data)
    token_type = "Bearer"
    auth_header = token_type + " " + access_token

    url = base_url + "/v4/integrations/pynwheel/devices/"

    response = HTTParty.put(url,
                            body: [{
                                "lock_id": updated_device_data.device_id,
                                "name": updated_device_data.name

                            }].to_json,
                            :headers => {'Authorization' => auth_header,
                                         'Accept' => 'application/vnd.lockstate+json; version=1',
                                         'Content-Type' => 'application/json'})
    # puts "---"*50
    # puts response
    # puts "---"*50

    return response
  end
  def update_deivces_in_db(response, dwelo_user)
    devices = response["data"]
    devices.each do |device|

      type = device["type"]
      name = device["attributes"]["name"]
      # serial_number = device["attributes"]["serial_number"]
      device_id = device["id"]
      # rml = RemoteLock.find_by(device_id: device_id, edge_state_id: @edge_state_user.id)
      remote_lock = RemoteLock.find_by(device_id: device_id, dwelo_id: dwelo_user.id)
      if remote_lock.nil?
        # remote_lock = RemoteLock.create(device_id: device_id, remote_lock_type: type, name: name, edge_state_id: @edge_state_user.id)
        remote_lock = RemoteLock.create(device_id: device_id, remote_lock_type: type, name: name, dwelo_id: dwelo_user.id)
      elsif remote_lock.remote_lock_type != type or remote_lock.name != name
        remote_lock.update_attributes(remote_lock_type: type, name: name)
      end
    end
    render json: {locks: RemoteLock.all}
  end


  def create_dwelo_access_guest(access_token, tour_user, current_time)
    @dwelo_user = Dwelo.first
    if @dwelo_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token

      url = base_url + "/v4/integrations/pynwheel/access_persons/"

      if current_time.to_s.count('-') == 2 # GMT +
        start_time = current_time.to_datetime.utc.strftime('%Y-%m-%dT%H:%M:%SZ')
        ends_time = (current_time + 90.minutes).to_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')
      elsif current_time.to_s.count('-') == 3 # GMT -
        char_pos = current_time.iso8601.to_s.rindex('-')
        index = char_pos - 1
        start_time = current_time.iso8601.to_s.slice(0..index).strftime('%Y-%m-%dT%H:%M:%SZ')
        ends_time = (current_time + 90.minutes).iso8601.to_s.slice(0..index).strftime('%Y-%m-%dT%H:%M:%SZ')
      end


      response = HTTParty.post(url,
                               body: {
                                   type: "access_guest",
                                   id: tour_user.id,
                                   starts_at: start_time,
                                   ends_at: ends_time
                                   # starts_at: "2020-08-05T02:00:00Z",
                                   # ends_at: "2020-08-05T16:12:00Z"


                               }.to_json,
                               :headers => {'Authorization' => auth_header,
                                            'Accept' => 'application/vnd.lockstate+json; version=1',
                                            'Content-Type' => 'application/json'})
      return response
    end
  end

  def delete_dwelo_access_guest(access_token, guest_id)
    @dwelo_user = Dwelo.first
    if @dwelo_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token

      url = base_url + "/v4/integrations/pynwheel/access_persons/"

      response = HTTParty.delete(url,
                                 :headers => {'Authorization' => auth_header,
                                              'Accept' => 'application/vnd.lockstate+json; version=1',
                                              'Content-Type' => 'application/json'},
                                 :body => [guest_id].to_json)


      return response
    end
  end

  def grant_dwelo_user_access(access_token, access_person_id, accessible_id)
    @dwelo_user = Dwelo.first
    if @dwelo_user.present?
      token_type = "Bearer"
      auth_header = token_type + " " + access_token

      url = base_url + "/v4/integrations/pynwheel/access_persons/accesses/"

      response = HTTParty.post(url,
                               body: {
                                   "access_person_id": access_person_id,
                                   "lock_id": accessible_id,
                               }.to_json,
                               :headers => {'Authorization' => auth_header,
                                            'Accept' => 'application/vnd.lockstate+json; version=1',
                                            'Content-Type' => 'application/json'})

      puts "---" * 50
      puts response
      puts "---" * 50

      return response
    end
  end

  def base_url
    "https://api-sandbox.dwelo.com"
  end

end

