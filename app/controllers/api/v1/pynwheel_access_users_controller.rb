class Api::V1::PynwheelAccessUsersController < ActionController::Base
  before_action :get_pynwheel_access_user_by_phone_number, only: [:generate_otp, :verify_otp]
  before_action :get_pynwheel_access_user_by_id, only: [:pynwheel_access_user_authentication]


  def pynwheel_access_user_authentication
    if @pynwheel_access_user.present?
      if @pynwheel_access_user.is_verified
        render json: {message: "Varified User", success_code: 200, status: true}
      else
        render json: {message: "Non Varified User", success_code: 404, status: false}
      end
    else
      render json: {message: "Pynwheel access user not found", success_code: 404, status: false}
    end
  end

  def generate_otp
    if @pynwheel_access_user.present?
      @pynwheel_access_user.update(pin_code: random_otp)
      sms_otp_to_mobile()
      ExpireOtpJob.perform_in(900, @pynwheel_access_user)
  
      render json: {message: "OTP is generated successfully and sent to user", success_code: 200}
    else
      render json: {message: "Pynwheel access user not found", success_code: 404}
    end

  end

  def verify_otp
    if @pynwheel_access_user.present?
      if @pynwheel_access_user.pin_code == params[:pin_code]
        verify_user(true)

        render json: {message: "Pynwheel access user is verified successfully", success_code: 200, user_data: @pynwheel_access_user}
      else
        verify_user(false)

        render json: {message: "OTP is wrong or expired", success_code: 404}
      end
    else
      render json: {message: "Pynwheel access user not found", success_code: 404}
    end
  end

  private

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