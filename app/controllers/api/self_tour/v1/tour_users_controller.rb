class Api::SelfTour::V1::TourUsersController < ActionController::Base
  include ApplicationHelper

  before_action :load_tour_user, only: :delete_account
  before_action :get_tour_user_by_phone_number, only: [:generate_otp, :verify_otp]
  before_action :get_apple_store_test_number, only: [:generate_otp, :verify_otp]

  def delete_account
    if @tour_user.present?
      if destroy_user
        render :json=> {:status=>true, :message => "User account permanently deleted!", status_code: 200}
      else
        render :json=> {:status=>false, :message => "Something went wrong on server!", status_code: 500}
      end
    else
      render :json=> {:status=>false, :message => "User with Id #{params[:id]} not found!", status_code: 401}
    end
  end

  def generate_otp
    if @tour_user.present?
      if @tour_user.phone_number === @apple_test_number
        render json: {message: "OTP is generated successfully and sent to user", success_code: 200, status: true }
      else
        @tour_user.update(pin_code: random_otp)
        sms_otp_to_mobile()
        # execute job after 15 minutes(900 seconds) to expire the OTP
        ExpireOtpJob.perform_in(900, @tour_user)
    
        render json: {message: "OTP is generated successfully and sent to user", success_code: 200, status: true}
      end
    else
      render json: {message: "User not found", success_code: 404, status: false, is_zerv_lock: false, zerv_credentials: {}}
    end
  end

  def verify_otp
    if @tour_user.present?
      if @tour_user.pin_code === params[:pin_code].to_s
        render json: {message: "User is verified successfully", success_code: 200, status: true, tour_user: @tour_user, access_token: encoded(@tour_user.id)}
      else
        render json: {message: "OTP is wrong or expired", success_code: 404, status: false}
      end
    else
      render json: {message: "User not found", success_code: 404, status: false}
    end
  end

  private

  def load_tour_user
    @tour_user ||= TourUser.find_by_id params[:id]
  end

  def destroy_user
    begin
      VisitedStop.where(tour_user_id: @tour_user&.id).destroy_all
      Feedback.where(tour_user_id: @tour_user&.id).destroy_all
      IglooGuest.where(tour_user_id: @tour_user&.id).destroy_all
      ZervGuest.where(tour_user_id: @tour_user&.id).destroy_all
      IgloohomeGuest.where(tour_user_id: @tour_user&.id).destroy_all
      AsGuest.where(tour_user_id: @tour_user&.id).destroy_all
      UserStripe.where(tour_user_id: @tour_user&.id).destroy_all
      TourHistory.where(tour_user_id: @tour_user&.id).destroy_all
      SchedualTour.where(tour_user_id: @tour_user&.id).destroy_all
      Prospect.where(tour_user_id: @tour_user&.id).destroy_all
      Chatroom.where(tour_user_id: @tour_user&.id).destroy_all
      LatchGuest.where(tour_user_id: @tour_user&.id).destroy_all
      Tour.where(tour_user_id: @tour_user&.id).destroy_all
      @tour_user.destroy!
      
    rescue
      false
    end
  end

  def sms_otp_to_mobile
    to_phone_number = @tour_user.phone_number
    message_body = "Verification code #{ @tour_user.pin_code }. Code will expire in 15 minutes."
    TwilioSmsService.new().send_sms(message_body, to_phone_number)
  end

  def get_tour_user_by_phone_number
    @tour_user = TourUser.find_by_phone_number(params[:phone_number])
  end

  def get_apple_store_test_number
    @apple_test_number = "+10123456789"
  end

  def random_otp
    rand(0000..9999).to_s.rjust(4, "0")
  end
  
end