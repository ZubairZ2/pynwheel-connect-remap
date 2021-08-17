class Api::V1::PynwheelAccessUsersController < ActionController::Base
  before_action :get_pynwheel_access_user_by_phone_number, only: [:generate_otp, :verify_otp]
  before_action :get_pynwheel_access_user_by_id, only: [:pynwheel_access_user_authentication, :resident_accesses_list, :dwelo_device_lock_or_unlock]
  before_action :is_authorized, only: [:resident_accesses_list, :resident_accesses_history]

  # include DweloDevicesHelper

  def pynwheel_access_user_authentication
    if @pynwheel_access_user.present?
      if @pynwheel_access_user.is_verified
        @zerv_present = is_zerv_present
        @access_token = encode_jwt_token(@pynwheel_access_user)
      else
        render json: {message: "Non Varified User", success_code: 404, status: false}
      end
    else
      render json: {message: "Pynwheel access user not found", success_code: 404, status: false}
    end
  end

  def resident_accesses_list
    
    if is_authorized
      dwelo_lock_access()
    else
      render json: {message: "Access denied", success_code: 401, status: false}
    end
  end

  def resident_accesses_history
    if is_authorized
      # render json: {message: "Resident's history access granted", success_code: 200, status: true}
    else
      render json: {message: "Access denied", success_code: 401, status: false}
    end
  end

  def generate_otp
    if @pynwheel_access_user.present?
      if is_zerv_present
        render json: {message: "Pynwheel access user with zerv lock", success_code: 200, status: true, is_zerv_lock: true, zerv_credentials: {username: @pynwheel_access_user&.community&.zerv&.username, password: @pynwheel_access_user&.community&.zerv&.password}}
      else
        @pynwheel_access_user.update(pin_code: random_otp)
        sms_otp_to_mobile()

        # execute job after 15 minutes(900 seconds) to expire the OTP
        ExpireOtpJob.perform_in(900, @pynwheel_access_user)
    
        render json: {message: "OTP is generated successfully and sent to user", success_code: 200, status: true, is_zerv_lock: false, zerv_credentials: {}}
      end
    else
      render json: {message: "Pynwheel access user not found", success_code: 404, status: false, is_zerv_lock: false, zerv_credentials: {}}
    end

  end

  def verify_otp
    if @pynwheel_access_user.present?
      if @pynwheel_access_user.pin_code == params[:pin_code].to_s || params[:is_zerv_lock] 
        @zerv_present = is_zerv_present
        verify_user(true)
        @access_token = encode_jwt_token(@pynwheel_access_user)
      else
        verify_user(false)
        render json: {message: "OTP is wrong or expired", success_code: 404, status: false}
      end
    else
      render json: {message: "Pynwheel access user not found", success_code: 404, status: false}
    end
  end

  def lock_access_time
    if is_authorized
      puts "-----------"*20
      puts params.inspect
      puts "-----------"*20
      render json: {message: "Lock access time", success_code: 200, status: true}
    else
      render json: {message: "Access denied", success_code: 401, status: false}
    end
  end

  def dwelo_device_lock_or_unlock
    if is_authorized          
      if @pynwheel_access_user.present?
        @community = @pynwheel_access_user.community
        dwelo_community_account= Dwelo.find_by(community_id: @community.id)
        access_token = dwelo_client_credentials(dwelo_community_account)

        token_type = "Bearer"
        auth_header = token_type + " " + access_token
        
        guest_id = @pynwheel_access_user.guest_id
        request_body = { "access_person_id": guest_id, "lock_id": params[:lock_id], "command": params[:command] }

        puts "--------------------------- commands request ----------------------------"
        puts request_body

        url = base_url + "/v4/integrations/pynwheel/devices/commands/"
        response = HTTParty.post(url,
                                body: {
                                    "access_person_id": guest_id,
                                    "lock_id": params[:lock_id],
                                    "command": params[:command]
                                }.to_json,
                                :headers => {'Authorization' => auth_header,
                                              'Accept' => 'application/vnd.lockstate+json; version=1',
                                              'Content-Type' => 'application/json'})

        puts "--------------------------- commands response ----------------------------"
        puts response

        if response.nil?
          render :json => {:success => true, :message => "Success"}
        else
          render :json => {:success => false, :message => response["message"]}
        end

        # render json: {message: "Dwelo lock unlocked", success_code: 200, status: true}
      else
        render json: {message: "Pynwheel access user not found", success_code: 404, status: false}
      end

    else
      render json: {message: "Access denied", success_code: 401, status: false}
    end

  end

  private

  def dwelo_lock_access()
    Thread.new do
      begin
      

      @community = @pynwheel_access_user.community
      providers_account = Dwelo.find_by(community_id: @community.id) rescue nil
      access_token = dwelo_client_credentials(providers_account)
      
      

      response = create_dwelo_access_guest(access_token)
      @pynwheel_access_user.update_attributes!(guest_id: response["id"])

      allowed_stops = locks_with_same_type("Dwelo")
      

      dwelo = Dwelo.find_by(community_id: @community.id)
      locks = RemoteLock.where(stop_id: allowed_stops, dwelo_id: dwelo.id).pluck(:device_id, :remote_lock_type)
      
      if locks.present?
        pynwheel_access_user_guest_id = @pynwheel_access_user.guest_id
        
        locks.each do |lock|
          grant_dwelo_user_access(access_token, pynwheel_access_user_guest_id, lock[0])
        end
      end

    rescue => ex
        puts "--------- Dwelo error -------- ", ex
      end

    end
  end

  def base_url
    @pynwheel_access_user&.community&.dwelo&.api_url
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

  def locks_with_same_type type, allowed_stops = []
    available_stops = @pynwheel_access_user.resident_access_points.pluck(:access_point_type, :access_point_id)
     
    available_stops.each do |stop|
      if (stop[0].classify.constantize.find_by_id stop[1]).lock_provider == type
        allowed_stops << stop[1]
      end
    end

    allowed_stops
  end


  def create_dwelo_access_guest(access_token)
    
    token_type = "Bearer"
    auth_header = token_type + " " + access_token
    id = SecureRandom.random_number(100000000)
    @pynwheel_access_user.update!(random_number: id)
    url = base_url + "/v4/integrations/pynwheel/access_persons/"

    start_time = Time.now.utc.strftime('%Y-%m-%dT%H:%M:%SZ')
    ends_time = (Time.now.utc + 90.minutes).strftime('%Y-%m-%dT%H:%M:%SZ')
    puts start_time
    puts ends_time

    request_body = { type: "access_guest", id: @pynwheel_access_user.random_number, starts_at: start_time, ends_at: ends_time }
    puts "--------------------------- create resident access_persons request ----------------------------"
    puts request_body


    response = HTTParty.post(url,
                              body: {
                                  type: "access_guest",
                                  id: @pynwheel_access_user.random_number,
                                  starts_at: start_time,
                                  ends_at: ends_time
                              }.to_json,
                              :headers => {'Authorization' => auth_header,
                                          'Accept' => 'application/vnd.lockstate+json; version=1',
                                          'Content-Type' => 'application/json'})

    puts "--------------------------- create resident access_persons response ----------------------------"
    puts response
    
    return response
  end
    
  def dwelo_client_credentials(community_dwelo_account)
    
    dwelo_user = Dwelo.find_by(community_id: community_dwelo_account.community_id)
    if dwelo_user.present?
      auth_url = base_url + "/v3/oauth/access_token"
      get_token_response = HTTParty.post(auth_url,
                                        body: {
                                            client_id: community_dwelo_account.client_id,
                                            client_secret: community_dwelo_account.client_secret,
                                            grant_type: "client_credentials"
                                        },
                                        headers: {'Content-Type' => 'application/x-www-form-urlencoded'})
      
                                        
      get_token_response["access_token"]
    end
  end


  


# ---------------------------------------------------------------------------------------------------------------------------------------------------------

  def is_zerv_present
    available_stops = @pynwheel_access_user.resident_access_points.pluck(:access_point_type, :access_point_id)
    zerv_is_present = false

    available_stops.each do |stop|
      if (stop[0].classify.constantize.find_by_id stop[1]).lock_provider == "Zerv"
        zerv_is_present = true
        break
      end
    end

    zerv_is_present
  end

  def is_authorized
    grant_pynwheel_user_access(decode_jwt_token(params[:access_token])) rescue false
  end

  def grant_pynwheel_user_access payload
    begin
      ( payload[0]["id"].present? &&  params[:user_id].present? &&  PynwheelAccessUser.find_by_id(payload[0]["id"].to_i) && (payload[0]["id"].to_i == params[:user_id].to_i) )
    rescue => ex
      false
    end
  end

  def encode_jwt_token user
    payload = {id: user.id, phone_number: user.phone_number}
    get_encoded_token(payload)
  end

  def get_encoded_token payload
    JWT.encode payload, ENV['RESIDENT_APP_SECRET_KEY'], 'HS256'
  end

  def decode_jwt_token token
    JWT.decode token, ENV['RESIDENT_APP_SECRET_KEY'], true, { algorithm: 'HS256' } rescue nil
  end

  def get_pynwheel_access_user_by_id
    @pynwheel_access_user = PynwheelAccessUser.find_by_id(params[:user_id])
  end

  def verify_user flag
    @pynwheel_access_user.update(is_verified: flag)
  end

  def sms_otp_to_mobile
    to_phone_number = @pynwheel_access_user.phone_number
    message_body = "Verification code #{ @pynwheel_access_user.pin_code }. Code will expire in 15 minutes."
    TwilioSmsService.new().send_sms(message_body, to_phone_number)
  end

  def get_pynwheel_access_user_by_phone_number
    @pynwheel_access_user = PynwheelAccessUser.where(phone_number: params[:phone_number]).first
  end

  def random_otp
    rand(0000..9999).to_s.rjust(4, "0")
  end

end