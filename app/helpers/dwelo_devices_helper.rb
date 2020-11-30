module DweloDevicesHelper
  def dwelo_client_credentials(community_dwelo_account)
    @dwelo_user = Dwelo.find_by(community_id: community_dwelo_account.community_id)
    if @dwelo_user.present?
      auth_url = "https://api.qa.dwelo.com/v3/oauth/access_token"
      get_token_response = HTTParty.post(auth_url,
                                         body: {
                                             client_id: community_dwelo_account.client_id,
                                             client_secret: community_dwelo_account.client_secret,
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
    available_ids = []
    if devices.present?
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
        available_ids << remote_lock.id
      end
      RemoteLock.where(dwelo_id: dwelo_user.id).where.not(id: available_ids).delete_all
    # else
    #   flash[:notice] = "Something went wrong, please check your credentials."
    #   # render :js => "window.location = '/communities/#{dwelo_user.community_id}/dwelos/new'"
    #   return false
    end
    # render json: {locks: RemoteLock.all}
  end


  def create_dwelo_access_guest(access_token, tour_user, current_time)
      token_type = "Bearer"
      auth_header = token_type + " " + access_token
      id = SecureRandom.random_number(100000000)
      tour_user.update!(random_number: id)
      url = base_url + "/v4/integrations/pynwheel/access_persons/"

      start_time = Time.now.utc.strftime('%Y-%m-%dT%H:%M:%SZ')
      ends_time = (Time.now.utc + 90.minutes).strftime('%Y-%m-%dT%H:%M:%SZ')
      puts start_time
      puts ends_time

      request_body = { type: "access_guest", id: tour_user.random_number, starts_at: start_time, ends_at: ends_time }
      puts "--------------------------- create access_persons request ----------------------------"
      puts request_body
      puts "--------------------------------------------------------------------------------------"


      response = HTTParty.post(url,
                               body: {
                                   type: "access_guest",
                                   id: tour_user.random_number,
                                   starts_at: start_time,
                                   ends_at: ends_time
                               }.to_json,
                               :headers => {'Authorization' => auth_header,
                                            'Accept' => 'application/vnd.lockstate+json; version=1',
                                            'Content-Type' => 'application/json'})

      puts "--------------------------- create access_persons response ----------------------------"
      puts response
      puts "----------------------------------------------------------------------------------------"
      return response
  end

  def delete_dwelo_access_guest(access_token, guest_id)

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

  def grant_dwelo_user_access(access_token, access_person_id, accessible_id)

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

      puts "------------------- create grant_access_person_accesses response -----------------------"
      puts response
      puts "----------------------------------------------------------------------------------------"

      return response

  end

  def base_url
    "https://api.qa.dwelo.com"
  end

end
