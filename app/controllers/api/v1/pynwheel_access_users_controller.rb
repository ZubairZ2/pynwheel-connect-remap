class Api::V1::PynwheelAccessUsersController < ActionController::Base
  before_action :set_pynwheel_access_user, only: [:generate_otp, :verify_otp]

  def generate_otp
    puts params.inspect
    binding.pry
    
    if @pynwheel_access_user.present?
      otp = generate_random_otp_code

      if otp.present?
        sms_otp(otp)

        render json: {message: "OTP generated successfully for #{params[:phone_number]} phone number. This OTP will expire after 1 minute", otp: otp, phone_number: params[:phone_number], success_code: 200}
      else
        render json: {message: "Something went wrong can not generate OTP. Please verify your phone number: #{params[:phone_number]}", success_code: 404}
      end

    else
      render json: {message: "Pynwheel access user not found with #{params[:phone_number]} phone number", success_code: 404}
    end
  end

  def verify_otp
    render json: {message: "success", success_code: 200}
  end


  private

  def sms_otp
  end

  def generate_random_otp_code
    rand(0000..9999).to_s.rjust(4, "0")
  end

  def set_pynwheel_access_user
    @pynwheel_access_user = PynwheelAccessUser.find_by(phone_number: params[:phone_number])
  end  
end