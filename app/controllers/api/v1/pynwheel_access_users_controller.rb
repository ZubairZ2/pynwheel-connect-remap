class Api::V1::PynwheelAccessUsersController < ActionController::Base
  before_action :get_pynwheel_access_user_by_phone_number, only: [:generate_otp, :verify_otp]
  before_action :get_pynwheel_access_user_by_id, only: [:pynwheel_access_user_authentication]
  before_action :is_authorized, only: [:resident_accesses_list, :resident_accesses_history]

  def pynwheel_access_user_authentication
    if @pynwheel_access_user.present?
      if @pynwheel_access_user.is_verified
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
      # render json: {message: "Resident's list access granted", success_code: 200, status: true}
    else
      render json: {message: "Access denied", success_code: 401, status: false}
    end
  end

  def resident_accesses_history
    if is_authorized
      # render json: {message: "Resident's history access granted", success_code: 200, status: true}
    else
      render json: {message: "Access denied", success_code: 200, status: true}
    end
  end

  def generate_otp
    if @pynwheel_access_user.present?
      @pynwheel_access_user.update(pin_code: random_otp)
      sms_otp_to_mobile()
      # execute job after 15 minutes(900 seconds) to expire the OTP
      ExpireOtpJob.perform_in(900, @pynwheel_access_user)
  
      render json: {message: "OTP is generated successfully and sent to user", success_code: 200, status: true}
    else
      render json: {message: "Pynwheel access user not found", success_code: 404, status: false}
    end

  end

  def verify_otp
    if @pynwheel_access_user.present?
      if @pynwheel_access_user.pin_code == params[:pin_code]
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

  private

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