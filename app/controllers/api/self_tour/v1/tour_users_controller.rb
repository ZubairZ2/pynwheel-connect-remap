module Api
  module SelfTour
    module V1
      class TourUsersController < BaseController
        include ApplicationHelper
        before_action :check_authentication, except: :get_tour_user
        before_action :set_tour_user
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
          begin
            if @tour_user.present?
              if @tour_user.phone_number === @apple_test_number
                render json: {message: "OTP is generated successfully and sent to user", success_code: 200, status: true }
              else
                send_otp_phone    
                render json: {message: "OTP is generated successfully and sent at #{params[:phone_number].present? ? params[:phone_number] : @tour_user.phone_number}", success_code: 200, status: true}
              end
            else
              render json: {message: "User not found", success_code: 404, status: false, is_zerv_lock: false, zerv_credentials: {}}
            end
          rescue => error
            render json: {message: error.message, success_code: 401, status: false}
          end
        end

        def verify_otp
          if @tour_user.present?
            if @tour_user.pin_code === params[:pin_code].to_s
              render json: {message: "User is verified successfully", success_code: 200, status: true, data: user_tours_data(@tour_user)}
            else
              render json: {message: "OTP is wrong or expired", success_code: 404, status: false}
            end
          else
            render json: {message: "User not found", success_code: 404, status: false}
          end
        end

        def get_tour_user
          if @tour_user.present?
            render json: {message: "User is verified successfully", success_code: 200, status: true, data: @tour_user, token: fetch_token()}
          else
            render json: {message: "User not found", success_code: 404, status: false}
          end
        end

        def update
          if @tour_user.present?
            if @tour_user.update(tour_user_params(:update))
              render json: {message: "User info updated successfully", success_code: 200, status: true, data: @tour_user, token: fetch_token()}
            else
              render json: {message: "Something went wrong!", success_code: 500, status: false}
            end
          else
            render json: {message: "User not found", success_code: 404, status: false}
          end
        end

        def completed_tours
          tours = @tour_user.user_completed_tours
          @tours = Kaminari.paginate_array(tours).page(params[:page]).per(params[:per_page])
        end

        private

        def send_otp_phone
          @tour_user.update(pin_code: random_otp)
          sms_otp_to_mobile()
          # execute job after 15 minutes(900 seconds) to expire the OTP
          ExpireOtpJob.perform_in(900, @tour_user)
        end

        def user_tours_data tour_user
          visited_history = VisitedStop.exists?(tour_user_id:  tour_user.id)

          upcoming = []
          completed_tours = []
          schedule_tours = tour_user.schedual_tours

          if schedule_tours.length > 0
            schedule_tours.each do |tour|
              upcoming << get_community_tour(tour) if !tour.is_tour_completed && !date_compare(tour)
              completed_tours << get_community_tour(tour) if tour.is_tour_completed
            end
          end

          {user: tour_user, upcoming_tours: upcoming.count, completed_tours:  completed_tours.count, visited_history: visited_history}
        end

        def get_community_tour tour
          if !tour.tour_date.nil?
            d = tour.tour_date
            t = tour.tour_time
            dt = DateTime.new(d.year, d.month, d.day, t.hour, t.min)
          else
            dt = DateTime.now
          end

          tour_type = tour.tour_type.eql?("") ? tour.property_tour_type : tour.tour_type
          
          return {schedule_tour_id: tour.id, tour_type: tour_type, tour_time: dt, community: tour.community}
        end

        def date_compare tour
          if tour.tour_time.nil?
            return false

          else
            d = tour.tour_date
            t = tour.tour_time
            tour_date_time = DateTime.new(d.year, d.month, d.day, t.hour, t.min, t.sec, t.zone)
            new_date = Date.today
            new_time = Time.now
            new_date_time = DateTime.new(new_date.year, new_date.month, new_date.day, new_time.hour, new_time.min, new_time.sec, new_time.zone)
            
            return tour_date_time <= new_date_time
          end
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
          to_phone_number = params[:phone_number].present? ? params[:phone_number] : @tour_user.phone_number
          message_body = "Verification code #{ @tour_user.pin_code }. Code will expire in 15 minutes."
          TwilioSmsWorker.perform_async(message_body, to_phone_number, @tour_user.email)
        end

        def set_tour_user
          tour_user_id =  params[:tour_user_id] || params[:id]
          if tour_user_id.present?
            # For registration screen
            @tour_user = TourUser.find_by_id(tour_user_id)
          else
            # For login screen
            @tour_user = TourUser.where(phone_number: params[:phone_number]).last
          end
        end

        def get_apple_store_test_number
          @apple_test_number = "+10123456789"
        end

        def random_otp
          rand(0000..9999).to_s.rjust(4, "0")
        end

        def fetch_token
          encoded(@tour_user)
        end

        def check_authentication
          has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
          render json: {message: "Invalid Token, Not Authorized!", success_code: 401, status: false} unless has_access
        end

        def tour_user_params(action)
          case action
          when :update
            params.require(:tour_user).permit(:first_name, :last_name, :email, :phone_number)
          end
        end

      end
    end
  end
end