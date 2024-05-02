class IgloohomeLockService < BaseService
      
  def initialize(community)
    @igloohome_account = Igloohome.find_by(community_id: community.id)
  end
  
  # DONE - Client credentials authorization
  def client_credentials
    return unless @igloohome_account.present?
  
    response = HTTParty.post(auth_base_url,
      body: client_credentials_params,
      headers: auth_request_header
    )
    
    handle_client_credentials_auth_response(response)
  end

  # DONE - Code grant authorization
  def code_grant_authorization(code)
    return unless code.present?

    response = HTTParty.post(auth_base_url, 
      body: code_grant_authorization_params(code), 
      headers: auth_request_header 
    )

    handle_code_grant_authorization_response(response)
  end

  # DONE - Refresh Token
  def get_access_token_after_refresh
    return unless @igloohome_account.present?

    response = HTTParty.post(auth_base_url, 
      body: get_access_token_after_refresh_params, 
      headers: auth_request_header 
    )

    @igloohome_account.update_attributes(refresh_token: response['refresh_token']) if response['refresh_token'].present?
    handle_client_credentials_auth_response(response)
  end

  def get_all_deivces(access_token)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

          url = base_url + "/devices"
          
          response = HTTParty.get(url,
              :headers => { 'Authorization' => auth_header,
                            'Accept' => 'application/vnd.lockstate+json; version=1' } )
          
          puts response

          return response
      end
  end

  def get_device(access_token,device_id)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

          url = base_url + "/devices/" + device_id 
          
          response = HTTParty.get(url,
              :headers => { 'Authorization' => auth_header,
                            'Accept' => 'application/vnd.lockstate+json; version=1' } )
         
          puts response
          
          return response
      end
  end

  def update_device(access_token,device_id,updated_device_data)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

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
          puts response

          return response
      end
  end

  def create_access_guest(access_token,tour_user,current_time)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

          url = base_url + "/access_persons"

          if current_time.to_s.count('-') == 2                            # GMT +
              start_time = current_time.iso8601.split('+')[0]
              ends_time = (current_time + 90.minutes).iso8601.split('+')[0]
          elsif current_time.to_s.count('-') == 3                         # GMT -
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
                      phone: '+' + SecureRandom.rand(99999999999).to_s,   # phone number need to be unique and Igloohome is giving us no information on phone that's why random number is given
                      starts_at: start_time,
                      ends_at: ends_time,
                      generate_pin: true
                  }
              }.to_json,
              :headers => { 'Authorization' => auth_header,
                              'Accept' => 'application/vnd.lockstate+json; version=1',
                              'Content-Type' => 'application/json' } )

          puts response

          return response
      end
  end
  
  def get_access_guest(access_token,guest_id)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

          url = base_url + "/access_persons/" + guest_id 
          
          response = HTTParty.get(url,
              :headers => { 'Authorization' => auth_header,
                            'Accept' => 'application/vnd.lockstate+json; version=1' } )
         
          puts response
          
          return response
      end
  end

  def delete_access_guest(access_token,guest_id)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

          url = base_url + "/access_persons/" + guest_id 
          
          response = HTTParty.delete(url,
              :headers => { 'Authorization' => auth_header,
                            'Accept' => 'application/vnd.lockstate+json; version=1',
                            'Content-Type' => 'application/json' } )
         
          puts response
          
          return response
      end
  end

  def update_access_guest(access_token,guest_id,tour_user)
      if @igloohome_account.present?
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
              :headers => { 'Authorization' => auth_header,
                            'Accept' => 'application/vnd.lockstate+json; version=1' ,
                            'Content-Type' => 'application/json'} )
         
          puts response
          
          return response
      end
  end

  def grant_access(access_token, access_person_id, accessible_id,accessible_type)
      if @igloohome_account.present?
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
              :headers => { 'Authorization' => auth_header,
                              'Accept' => 'application/vnd.lockstate+json; version=1',
                              'Content-Type' => 'application/json' } )
          
          puts response

          return response
      end
  end

  def get_all_events(access_token,page)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''
          url = page > 1 ? base_url + "/events/?page="+ page.to_s : base_url + "/events" 
          response = HTTParty.get(url,
              :headers => { 'Authorization' => auth_header} )
          
          puts response

          return response
      end
  end

  def get_dwelo_events(access_token,guest_id)
      @dwelo_user = Dwelo.first
      if @dwelo_user.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''
          url = base_url + "/v4/integrations/pynwheel/events/?access_person_id=" + guest_id
          response = HTTParty.get(url,
                                  :headers => { 'Authorization' => auth_header} )

          puts response

          return response
      end
  end

  def create_igloo_guests(access_token,tour_user,igloo_lock_id,current_time)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

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

          puts "--------------------------  create igloo guests request body ------------------------------"
          puts body
          puts "-------------------------------------------------------------------------------------------"

          url = base_url + "/igloo_guests"
          response = HTTParty.post(url,
              body: body,
              :headers => { 'Authorization' => auth_header,
                              'Accept' => 'application/vnd.lockstate+json; version=1',
                              'Content-Type' => 'application/json' } )

          puts "-----------------------------  create igloo guests response -------------------------------"
          puts response
          puts "-------------------------------------------------------------------------------------------"

          return response
      end
  end

  def delete_igloo_guests(access_token,igloo_guest_id)
      if @igloohome_account.present?
          token_type = "Bearer"
          auth_header = token_type + " " + access_token rescue ''

          url = base_url + "/igloo_guests/" + igloo_guest_id           
          response = HTTParty.delete(url,
              :headers => { 'Authorization' => auth_header,
                            'Accept' => 'application/vnd.lockstate+json; version=1',
                            'Content-Type' => 'application/json' } )

          puts response

          return response
      end
  end

  def update_deivces_in_db(responce)
      if @igloohome_account.present?
          available_ids = []
          devices = responce["data"]
          devices.each do |device|
              type = device["type"]
              name = device["attributes"]["name"]
              serial_number = device["attributes"]["serial_number"]
              device_id = device["id"]

              igloohome_lock = IgloohomeLock.find_by(device_id: device_id, igloohome_id: @igloohome_account.id)
              if igloohome_lock.nil?
                  rml = IgloohomeLock.create(device_id: device_id, name: name, igloohome_id: @igloohome_account.id)
              elsif igloohome_lock.name != name
                  igloohome_lock.update_attributes(name: name)
              end
              available_ids << igloohome_lock.id
          end
          IgloohomeLock.where(igloohome_id: @igloohome_account.id).where.not(id: available_ids).delete_all
      end
  end

  private

    def get_access_token_after_refresh_params auth_code
      {
        'grant_type' => 'refresh_token',
        'client_id' => client_id_through_pynwheel,
        'refresh_token' => @igloohome_account.refresh_token
      }
    end

    def code_grant_authorization_params auth_code
      {
        'grant_type' => 'authorization_code',
        'client_id' => client_id_through_pynwheel,
        'code' => auth_code,
        'redirect_uri' => redirect_uri
      }
    end

    def client_credentials_params
      { 'grant_type' => 'client_credentials' }
    end

    def auth_request_header
      { 
        'Authorization' => "Basic #{encode_credentials}",
        'Content-Type' => 'application/x-www-form-urlencoded' 
      }
    end

    def encode_credentials
      Base64.strict_encode64("#{client_id_associated_with_client}:#{secret_id_associated_with_client}")
    end

    def handle_client_credentials_auth_response
      if response.code == 200 && response["access_token"]
        puts response["access_token"]
        return response["access_token"]
      else
        raise "Error: #{response.code} - #{response.body}"
      end
    end

    def handle_code_grant_authorization_response
      if response.code == 200 && response["access_token"]
        puts response["access_token"]
        return response
      else
        raise "Error: #{response.code} - #{response.body}"
      end
    end

    def client_id_through_pynwheel
      ENV["PYNWHEEL_IGLOOHOME_CLIENT_ID"]
    end

    def secret_id_through_pynwheel
      ENV["PYNWHEEL_IGLOOHOME_SECRET_ID"]
    end

    def client_id_associated_with_client
      @igloohome_account.client_id
    end

    def secret_id_associated_with_client
      @igloohome_account.client_secret
    end

    def base_url
      "https://api.igloodeveloper.co/igloohome"
    end

    def auth_base_url
      "https://auth.igloohome.co/oauth2/token"
    end

    def redirect_uri
      "https://pynwheelconnect.com/"
    end
end