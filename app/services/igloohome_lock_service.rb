class IgloohomeLockService < BaseService
# {
#   "id_token": "eyJraWQiOiJzMHFLQkE0T3JXR0NZQnRod3dcL0RzcERNVkZXdXZ6UDhKazJBd2owM0RKTT0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiV2JiSXo2V2RPZ1VIWVh3c2FTUXFNdyIsInN1YiI6IjczMWY3MGU3LTEwN2EtNDVlNS1hMzM0LTRhZDYwNzA3YTEzOSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV83NTB0enc3ZVUiLCJjb2duaXRvOnVzZXJuYW1lIjoiRGxjSVptbmdrTjcxaFRaQnNzakYiLCJvcmlnaW5fanRpIjoiYzY5MTNlODgtOGMzMC00ZTFjLWI5NjItYWJmMzM2M2EzN2JjIiwiYXVkIjoiNGNxZWZvNG1rbTAxNzBpMGs0NWg5ZGZpMDEiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTcxNDk5MDQwNSwibmFtZSI6IlB5bndoZWVsIFN1cHBvcnQiLCJleHAiOjE3MTUwNzY4MDUsImlhdCI6MTcxNDk5MDQwNiwianRpIjoiNjZjNmZjZjQtOTA0YS00NzJkLThiODEtYTlhY2I2MThlZTJmIiwiZW1haWwiOiJzdXBwb3J0QHB5bndoZWVsLmNvbSJ9.DxzlNflQEcuMdMq_R1orsxzqPW2Wlu9qPBpjO0lH5YYxA5CNbi41HiGsYQ3hWWknhoTVyCBAJR5nOLxyTyH9qCXN7H2w_ntX8TWUle45cXSZgeEZnhQR_2hGpbpxUe6UWt9ZA_6phgdTmHPslReiAp8U-FAIf1E_mwjcg1VZg7vEDsx0TWS2zopTUzGWzTNU9nHcTry8vwBEN1gQGwnXjNsgfL2SKWfhm0Ul2nnraxcpbIQ5flcBDm6-9yTrU_k9HXp6783bMt9ti2eg7ev253RSKyJFUcKlQxsjy4BKZFpyfxbYJ4WD5pYrITQ9jJUFBOIXd2HAgwzPc8Q4vYGx_w",
#   "access_token": "eyJraWQiOiJMNGhScm1BbzEya2lVa3BvVlM1Tkg0KytGWUhXb0FmZU0zXC90RTViMkRmUT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI3MzFmNzBlNy0xMDdhLTQ1ZTUtYTMzNC00YWQ2MDcwN2ExMzkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV83NTB0enc3ZVUiLCJ2ZXJzaW9uIjoyLCJjbGllbnRfaWQiOiI0Y3FlZm80bWttMDE3MGkwazQ1aDlkZmkwMSIsIm9yaWdpbl9qdGkiOiJjNjkxM2U4OC04YzMwLTRlMWMtYjk2Mi1hYmYzMzYzYTM3YmMiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImlnbG9vaG9tZWFwaVwvY3JlYXRlLXBpbi1icmlkZ2UtcHJveGllZC1qb2IgaWdsb29ob21lYXBpXC91bmxvY2stYnJpZGdlLXByb3hpZWQtam9iIGlnbG9vaG9tZWFwaVwvYWxnb3Bpbi1vbmV0aW1lIGlnbG9vaG9tZWFwaVwvZ2V0LXByb3BlcnRpZXMgb3BlbmlkIGlnbG9vaG9tZWFwaVwvYWxnb3Bpbi1kYWlseSBwcm9maWxlIGlnbG9vaG9tZWFwaVwvbG9jay1icmlkZ2UtcHJveGllZC1qb2IgaWdsb29ob21lYXBpXC9nZXQtZGV2aWNlcyBpZ2xvb2hvbWVhcGlcL2FsZ29waW4tcGVybWFuZW50IGlnbG9vaG9tZWFwaVwvZ2V0LWpvYi1zdGF0dXMgaWdsb29ob21lYXBpXC9hbGdvcGluLWhvdXJseSBpZ2xvb2hvbWVhcGlcL2RlbGV0ZS1waW4tYnJpZGdlLXByb3hpZWQtam9iIGlnbG9vaG9tZWFwaVwvZ2V0LW1hc3Rlci1waW4iLCJhdXRoX3RpbWUiOjE3MTQ5OTA0MDUsImV4cCI6MTcxNTA3NjgwNSwiaWF0IjoxNzE0OTkwNDA2LCJqdGkiOiI0NDlhNzZhMy01Mjc0LTQxMjgtOWRjMi1jNTEwYmI0MWNjNzYiLCJ1c2VybmFtZSI6IkRsY0labW5na043MWhUWkJzc2pGIn0.BFD3PWpcTKlsb8_acAgoBXptVxLRXEgpVI4n3-bnwNkQjLkTjU_MDKLSgECqL89hUP4frFVCROrjiIoY3o7zkbFSj0-ljS73-L9UEbRWyIoA93le7hENgt9WBzwehUz8UWG7HOCgv1FR6oUCyFgR79EstdpUwxBdHE_Xz2sT9zv4qgkQ5GpPBk1MIDCHGWTTLG0h7EXQI2-ZOqZK74LrbBWBnkVik76L-Dzn3dYQk7Zk6h877JhnF5Y9PjCXDBOfGpvzBC3Qc0BBsi2FLmnlPHDV4bBugcKcGF-NZt4oxEgNwQBsySYHGeFcOzHYCFiix5grBzsM17uUul4vYmrr-Q",
#   "refresh_token": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.tcL44_KNr0Qqg7rh-0bLUIrIN6vraXjPvZKExte62xEHaRETVyS47kddFgK1PBCzhJNZ7FhbzP7YSlIoAtv-MCLTIdw05VtkuQPO3hoc5y50E18Irvg8F2mNWGkxU3UYvuY01bTdihTaRqV5BmUUSjlZ0Sg7gx1b884v8E-R5bwEWowDzupn2bhPEHWaONHfzL9Jw39Q4r-_YS_qKM7EfmYPyL6l4Woz1Qlk51XpFc2TSeESge8rvb1zzhhZDcVZOJeT7PUYtrzEpI-4mA63q03cEXQgyQP5v-J8MbrEvmd2joe6Zsv1YAkX2IF5471ExBiBeGU5YwDQugNhCqlCzQ.GDGbNlFbcCiea3A8.MEksHgSkIuAm4mMh7rowZDd6H0BPMkVA0LadW-dHUfBntIWwG-Ou4qqjqJgF28C8uXztVO5BWbh-oW7aZPVmtIfTVpuhPgkTGWb0EcEHb78j7KdbtZdSz7OatvNEndNomrAK0pUk0K1exOAjQiYAreM2w2N9gi9NhXZyZ97BrvBt6gJvJ3zZnISksWYw6ejalB1X7p9SwDTpX17rwQWTxiRPRGf7A9t7UYJiuiW87aFQ9iijHj-Qw-LNm6oCWyu4kTTk90miK7nHSWsR6gaG3OF-oYZ4ZpwTWO7fdyEjyP37KtpZN_QP8Z6OHrf_sk1iTUw5NOS75I_4X2EVGilhSQhyd6uWzWv7O_OnmspSC7sOWulWFQiZBuKtjrkDNuuOAAKqzCP4FVx4nYLPXMNcPXD72kKAVXhPYcj9feHB7hIqKnk1450kcZLGnM3CPqNGsU1Uu12_I6d7YL97Xp0J7HZpWmCSCjGKQfmaFV6sBYyDc4OGWR7cggj8kfdMCg3OUTnIYBHMgrSlEXq3Shs9bZrRXfKI2ohf5B5B0wStO_-ai7Rf5Oi7nf_6JtcpUDAe3souDUSvIhToIr_hIBEbSHK6KsM6IVlwnvZhZJgIaOtrZ_ztyuv3XyZiUJd9P1dX1EzmWbKygRoRtUdDy4g1W2r5OQDVeVLQR1bmqeGZ23l8kkj9V7F3xEFkKM6GntXKIUA0egsbHPBwtMMwkJJ95F4XLaSgPKGEWc1kbTMJZhXBjnhIzt9nU_E0yrxmmqAz-7mcWho5f-Xunl2heDywM4rZkyJoumS6b2nd3mj5aCqTCt7rSOrgAVNEiPXvGiT4wOt3OzehlatJ7wUl0QdOGKaMtLUlShIPDxzEpRZ8az1KO22NanmU5XFQsFfSUi5jL-ly79yyLKqDEIRTCLC2zuHgbXXG9vDqY9m-d-nr4FkoPhKRcMRPEw8N6SQSvm8CwC07LQbdcoeevlZHZKYn6e0qG_jgq8tsBimS3qXklAWf2Q1x8SZOEoPc6X2IHavIRoPtEsjSPbNxdwM3TwKwhjzM8vvh3IAWkJto-zrDZ3LnQYd_WctNTWWIE80PaDrTbq86XE-tmAxW8bPjj6U6v55FxPVTyMaNG37GCxQAAyBDF3iXjO5kziX95iCkPh2lrrvoQNHl60uwuE2WGCPSd1ekngaUhiovCsFPtgfbiuOHtT54vxVyAlRlF5EksOpoOBa3BRQHUtDbRxkcr6zzldavfhzqLk3Iw0pHbpOeeoYwxgYafsAbR-hIBu4h6yIqSKigEWPINqusyL6us2xEjs9qBhwHTdT9MInMHn_uXEQtmOKerB6JCF1pb39D045kqWS2bZhCEZ27_u_m72ec8w3ukGvJV1Mrwin1AKe8wqwEvQ8M5FqnoCexjevbKsrLmOx9R8b7bsQAJBpGoKkv9lBvJ7NpcAvk5PbVgwF7pbRsYlC1GmvDZ99k2e53X8v68Cq6Qx-K4WBz2A1_SzjOgV_MV3B8et1dIVqqLanPKCw-rSoRRQlY846IkewLNU_9Jp2_5u_fJja4nCF0Y9U4QerKue9bQUqW_KKhqPyAPQyGIW98baWpiaCkEEhcvQ6zrPyLchV01qKv8NrF4viw7AveYcolQ-nz2nBuydzD2tEmhmyTspzw4YTd8WUvF2IzrNxRDoROa25bHz9-67kq29zxu8iRchSOmh2_7Xx3fbDV-GtKGYYg6pRWDxJR2GRiJum82-efjkfN7SBnobEY9uzQ8k2hIAFTuBCk3k8nJyCCOJxolDLh3HiSA-8R1Be-8XTs_SHhsJkSAe89Slp9wqqVf7qYGf22LKoKIYMo2KvZ4SOsPsdxzAGLdCeF-bkD-vusxkf8NFxze4qr4IThFOpABKkfQrlR77Ak-uKgi9rPyCUmXFPX47HfnmJhG_-YbYc.SCri81CGKYQuyacKOwDOzA",
#   "expires_in": 86400,
#   "token_type": "Bearer"
# }
  def initialize(community)
    @igloohome_account = Igloohome.find_by(community_id: community.id)
  end

  def is_user_authorized?
    begin
      access_token_expired? ? renew_access_token : true
    rescue
      false
    end
  end 

  def access_token_expired?
    @igloohome_account&.access_token.nil? || Time.now >= @credential&.access_token_expiry
  end

  def refresh_token_expired?
    @igloohome_account&.refresh_token.nil? || Time.now >= @credential&.refresh_token_expiry
  end

  def renew_access_token
    unless refresh_token_expired?
      #just refresh access_token
    else
      #fetch new token
    end

    return true
  end
  
  # DONE - Client credentials authorization
  def client_credentials
    return unless @igloohome_account.present?
  
    response = HTTParty.post(auth_base_url,
      body: client_credentials_params,
      headers: client_auth_request_header
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

    binding.pry
    response = HTTParty.post(auth_base_url, headers: auth_request_header, body: get_access_token_after_refresh_params)
    # @igloohome_account.update_attributes(refresh_token: response['refresh_token']) if response['refresh_token'].present?
    # handle_client_credentials_auth_response(response)
    puts "\n\n\n Response: \n"
    puts response.body

  end

  def get_all_deivces(access_token)
    return unless @igloohome_account.present? && access_token.present?

    HTTParty.get("#{api_base_url}/devices", :headers => api_request_header(access_token)) 
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

    def get_access_token_after_refresh_params
      {
        'client_id' => client_id_through_pynwheel,
        'grant_type' => 'refresh_token',
        'refresh_token' => @igloohome_account.refresh_token
      }
    end

    def code_grant_authorization_params auth_code
      {
        'code' => auth_code,
        'client_id' => client_id_through_pynwheel,
        'grant_type' => 'authorization_code',
        'redirect_uri' => redirect_uri
      }
    end

    def client_credentials_params
      { 'grant_type' => 'client_credentials' }
    end

    def auth_request_header
      {
        'Authorization' => "Basic #{encode_pynwheel_credentials}",
        'Content-Type' => 'application/x-www-form-urlencoded',
      }
    end

    def client_auth_request_header
      { 
        'Authorization' => "Basic #{encode_client_credentials}",
        'Content-Type' => 'application/x-www-form-urlencoded' 
      }
    end

    def api_request_header(access_token)
      { 'Authorization' => "Bearer #{access_token}" }
    end

    def encode_pynwheel_credentials
      binding.pry
      Base64.strict_encode64("#{client_id_through_pynwheel}:#{secret_id_through_pynwheel}")
      # Base64.strict_encode64("4cqefo4mkm0170i0k45h9dfi01:cvc489mpjmjrtp7fdiamfg2019tr7qrhr0snk1v8aqp06msbirf")
    end

    def encode_client_credentials
      Base64.strict_encode64("#{client_id_associated_with_client}:#{secret_id_associated_with_client}")
      # Base64.strict_encode64("4cqefo4mkm0170i0k45h9dfi01:cvc489mpjmjrtp7fdiamfg2019tr7qrhr0snk1v8aqp06msbirf")
    end

    def handle_client_credentials_auth_response response
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

    def api_base_url
      "https://api.igloodeveloper.co/igloohome"
    end

    def auth_base_url
      "https://auth.igloohome.co/oauth2/token"
    end

    def redirect_uri
      "https://pynwheelconnect.com/"
    end
end