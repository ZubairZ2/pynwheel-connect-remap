module Api
  module V1
    class ScheduleToursController < BaseController
      before_action :authenticate_token!, except: [:authorize_vendor]
      before_action :find_community, only: [:tour_types, :tour_dates, :time_slots, :schedule_tour]

      def authorize_vendor
        @api_access_key = authorize_params[:api_access_key]
        if @api_access_key == vender_api_access_key
          render :authorize_vendor
        else
          render json: { is_success: false, error_code: 404, message: "Access key is invalid, please contact to support", data: {} }
        end
      end

      def communities
        @communities = Community.joins(:tour).where('tours.only_scheduled_tour = ?',true).self_tour_enabled_only.desc_created_at
        if @communities.present?
          render :communities
        else
          render json: { is_success: false, error_code: 404, message: "No Communities were not", data: {} }
        end
      end

      def tour_types
        @tour_types ||= []
        tour_setting = @community.community_tour&.tour_setting
        @tour_types << "self_tour" if tour_setting&.allow_self_tour
        @tour_types << "guided_tour" if tour_setting&.allow_guided_tour
        @tour_types << "virtual_tour" if tour_setting&.allow_virtual_tour
        if @tour_types.present?
         render :tour_types
        else
          render json: { is_success: false, error_code: 404, message: "No Tour has been allowed for this community", data: {} }
        end
      end

      def tour_dates
        tour_setting = @community.community_tour&.tour_setting
        allow_self_tour = tour_setting&.allow_self_tour
        allow_guided_tour = tour_setting&.allow_guided_tour
        allow_virtual_tour = tour_setting&.allow_virtual_tour
        tour_type = params['tour_type'] if params['tour_type'].present?
        self_tour = tour_type == "self_tour" && allow_self_tour
        guided_tour = tour_type == "guided_tour" && allow_guided_tour
        virtual_tour = tour_type == "virtual_tour" && allow_virtual_tour
        if self_tour or guided_tour or virtual_tour
          if self_tour
            week_days = (allow_self_tour && @community.opening_hours.present?) ? @community.opening_hours.where('closing_time > ?', DateTime.now.to_s(:time)).order(:sort).pluck(:day) : []
          elsif guided_tour
            week_days = (allow_guided_tour && @community.guided_opening_hours.present?) ? @community.guided_opening_hours.where('closing_time > ?', DateTime.now.to_s(:time)).order(:sort).pluck(:day) : []
          end
          start_date = virtual_tour ? Date.today : week_days[0].present? ? Date.parse(week_days[0]) : ""
          # month_dates = (start_date..start_date+30.days) if start_date.present?
          month_dates = (start_date..(start_date+1.month)) if start_date.present?
          @tour_dates ||=[]
          @available_dates ||=[]
          month_dates.each {|m| @tour_dates << m}
          if virtual_tour
            @tour_dates.each{|vt| @available_dates << vt.strftime("%d/%m/%Y") }
          else
            @tour_dates.each do |td|
              week_days.each do |week_day|
                @available_dates << td.strftime("%d/%m/%Y") if week_day == td.strftime("%A") #&& Date.parse(week_day) >= Date.today
              end
            end
          end
          if @tour_dates.present?
            render :tour_dates
          else
            render json: { is_success: false, error_code: 404, message: "No Date is available to schedule tour", data: {} }
          end
        else
          render json: { is_success: false, error_code: 400, message: "Tour type does not match to allowed tours", data: {} }
        end  
      end

      def time_slots
        @stepping = @community.community_tour.tour_setting.time_intervel == '15 min' ? 15 : (@community.community_tour.tour_setting.time_intervel == '30 min' ? 30 : (@community.community_tour.tour_setting.time_intervel == '1 hr') ? 60 : (@community.community_tour.tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
        @tour_type = params['tour_type']
        @tour_date = params['tour_date']
        @requested_day = DateTime.strptime(@tour_date, "%d/%m/%Y").strftime("%A")
        @available_time_slots = SchedulerWidgetService.new(@community).time_slots_for_appartments(@stepping,@tour_type,@requested_day,@tour_date)
        if @available_time_slots.present?
          render :time_slots
        else
          render json: { is_success: false, error_code: 404, message: "No time slot for this tour type on given date", data: {} }
        end
      end

      def schedule_tour
        phone_number = make_phone
        @tu = TourUserSearcherService.new(phone_number, params[:email].downcase).find_tour_user()

        desired_bedroom = params[:desired_bedroom] if params[:desired_bedroom].present?

        f_name = params[:first_name].present? ? params[:first_name] : ""
        l_name = params[:last_name].present? ? params[:last_name] : ""
        @tu = TourUser.new name: (f_name + " " + l_name), first_name: params[:first_name], last_name: params[:last_name], email: params[:email].downcase, phone_number: phone_number, desired_bedroom: desired_bedroom unless @tu.present?
        @tu.name = (f_name + " " + l_name)
        @tu.first_name = f_name
        @tu.last_name = l_name
        @tu.phone_number =  phone_number.present? ? phone_number : @tu.phone_number
        @tu.email = params[:email].present? ? params[:email].downcase : @tu.email
        @tu.desired_bedroom = params[:desired_bedroom] if params[:desired_bedroom].present?
        @tu.card_last_digits = params[:credit_card_number].last 4 if params[:credit_card_number].present?
        credit_card_number = params[:credit_card_number] if params[:credit_card_number].present?
        exp_month = params[:exp_month] if params[:exp_month].present?
        exp_year = params[:exp_year] if params[:exp_year].present?
        card_verification = params[:card_verification] if params[:card_verification].present?
        
        if @tu.save
          begin
            if(@tu.strip_customer_id.present?)
              res = charge_customer(@tu, 50, "Escrow Payment", 'usd')
            else
              # @tu.update_column 'strip_customer_id', create_customer(@tu.email, params[:tour_user][:card_token]).id
              SchedulerWidgetService.new(@community).save_tour_user_card_info(@tu.id,credit_card_number,exp_month,exp_year,card_verification)
              res = charge_customer(@tu, 50, "Escrow Payment", 'usd')
            end

            sleep 2
            pay_back = refund_customer(@tu, res[:id])
                   
          rescue Exception => e
            puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{e.message} ---"
          end
          desired_move_in_date = params[:desired_move_in_date].to_datetime.strftime("%m/%d/%y") if params[:desired_move_in_date].present?
          if desired_move_in_date.present?
            date = desired_move_in_date.split('/')
            date[0],date[1] = date[1],date[0]
            date = date.join('-').to_date
            desired_move_in_date = date
          else
            desired_move_in_date = ""
          end

          timezone = @community.get_time_zone()
          # new_tour = SchedualTour.find(params[:sched_tour_id])
          tour_type = params[:tour_type] if params[:tour_type].present?
          tour_date = params[:tour_date] if params[:tour_date].present?
          tour_time = params[:tour_time] if params[:tour_time].present?
          new_tour = SchedualTour.new(community_id: params[:property_id], user_time_zone: timezone, tour_type: tour_type, tour_date: tour_date, tour_time: tour_time)
          if new_tour.save
            schedual_tour = MaxDateScheduledTourService.new(@tu, @community, true).get_scheduled_tour

            unless schedual_tour.present?
              scheduled_tours = @community.schedual_tours.where(tour_user_id: @tu.id)
              
              if scheduled_tours.present?
                new_tour.update(stops_list: scheduled_tours.last.stops_list)
              end
            end

            
            schedual_tour = (schedual_tour.present? && !schedual_tour.is_tour_completed) ? schedual_tour : new_tour

            previous_tour = {
              tour_date: schedual_tour.tour_date,
              tour_time: schedual_tour.tour_time,
              is_rescheduled: schedual_tour.tour_user_id.present?
            }
            
            is_rescheduled = false
            
            schedual_tour.update(tour_date: new_tour.tour_date, tour_time: new_tour.tour_time, tour_user_id: @tu.id,charge_id: res.present? ? res[:id] : nil, pay_back_id: pay_back.present? ? pay_back.refund_id : nil, desired_move_in_date: params[:desired_move_in_date], desired_bedroom: desired_bedroom , created_by: "Appartments.com")

            if previous_tour[:is_rescheduled]
              is_rescheduled = true
              new_tour.delete
            end
            
            begin
              sent_notifications = SchedulerWidgetService.new(@community).send_email_and_other_notifications(schedual_tour, previous_tour, is_rescheduled)
            rescue Exception => e
              puts "<<<<<<<<<<<<<<<<<<<<<<<<<<<#{e.message} #{e.backtrace} ---"
            end

          end
          @schedule_tour = schedual_tour
          if @schedule_tour.present?
            render :schedule_tours
          else
            render json: { is_success: false, error_code: 1000, message: new_tour&.errors&.full_messages&.first.present? ? new_tour.errors.full_messages.first : "Invalid Client Credentials, Please verify and try again" , data: {} }
          end
        else
          render json: { is_success: false, error_code: 1000, message: @tu&.errors&.full_messages&.first.present? ? @tu.errors.full_messages.first :  "Invalid Client Credentials, Please verify and try again" , data: {} }
        end
      end
      
      private

      def make_phone
        begin
          user_phone = params[:phone_number].sub(/^[0]+/,'')
          user_phone = trim_leading('\+', user_phone) if user_phone.starts_with? '+'

          c = ISO3166::Country.new(params[:country_code])
          if user_phone.starts_with? c.country_code
            user_phone = "+#{user_phone}"
          else
            user_phone = "+#{c.country_code}#{user_phone}"
          end
          user_phone
        rescue => ex
          ""
        end
      end
      
      def find_community
        # community_id = JsonWebToken.decode(params[:property_code])
        @community = Community.joins(:tour).where('tours.only_scheduled_tour = ?',true).self_tour_enabled_only.find(params[:property_id])
      rescue ActiveRecord::RecordNotFound
        render json: { is_success: false, error_code: 404, message: "Property not found.", data: {} }, status: :not_found
      end

      def authorize_params
        params.permit(:api_access_key)
      end

      def schedule_tour_params
        params.permit(:property_id, :first_name, :last_name, :email, :phone_number, :desired_bedroom, :desired_move_in_date, :tour_type, :tour_date, :tour_time, :credit_card_required)
      end
      
      def authenticate_token!
        payload = JsonWebToken.decode(auth_token)
        render json: {is_success: false, error_code: 400, message: "Auth token is missing or invalid", data: {} } if vender_api_access_key != payload["sub"] 
        rescue JWT::DecodeError
          render json: {is_success: false, error_code: 400, message: "Auth token is missing or invalid", data: {} }
      end

      def auth_token
        @auth_token ||= request.headers['Authorization']
      end

      def vender_api_access_key
        ENV['APPARTMENTS_API_KEY_ACCESS']
      end
    end
  end
end
