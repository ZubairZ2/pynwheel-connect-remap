class Api::V1::ScheduleToursController < ActionController::Base
  before_action :authenticate_token!, except: [:authorize_vendor]
  before_action :find_community, only: [:tour_types, :tour_dates, :time_slots]

  def authorize_vendor
    @api_access_key = authorize_params[:api_access_key]
    if @api_access_key == vender_api_access_key
      render :authorize_vendor
    else
      render json: { is_success: true, error_code: 400, message: "Your access key is invalid, please contact to support", data: nil }
    end
  end

  def communities
    @communities = Community.joins(:tour).where('tours.only_scheduled_tour = ?',true).self_tour_enabled_only.desc_created_at
    if @communities.present?
      render :communities
    else
      render json: { is_success: true, error_code: 400, message: "No Communities were not", data: nil }
    end
  end

  def tour_types
    @tour_types ||= []
    tour_setting = @community.tour&.tour_setting
    # binding.pry
    @tour_types << {title: "Self Tour"} if tour_setting&.allow_self_tour
    @tour_types << {title: "Guided Tour"} if tour_setting&.allow_guided_tour
    @tour_types << {title: "Virtual Tour"} if tour_setting&.allow_virtual_tour
    if @tour_types.present?
     render :tour_types
    else
      render json: { is_success: true, error_code: 400, message: "No Tour has been allowed for this community", data: nil }
    end
  end

  def time_slots
    @stepping = @community.tour.tour_setting.time_intervel == '15 min' ? 15 : (@community.tour.tour_setting.time_intervel == '30 min' ? 30 : (@community.tour.tour_setting.time_intervel == '1 hr') ? 60 : (@community.tour.tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
    @tour_type = params['tour_type']
    # binding.pry
    @tour_date = params['tour_date']
    @requested_day = DateTime.strptime(@tour_date, "%d/%m/%Y").strftime("%A")
    @available_time_slots = SchedulerWidgetService.new(@community,@stepping,@tour_type,@requested_day,@tour_date).time_slots_for_appartments
    if @available_time_slots.present? and Date.parse(tour_date) >= Date.today
      render :time_slots
    else
      render json: { is_success: true, error_code: 400, message: "No time slot for this tour type on given date", data: nil }
    end
  end

  def tour_dates
    tour_setting = @community.tour&.tour_setting
    allow_self_tour = tour_setting&.allow_self_tour
    allow_guided_tour = tour_setting&.allow_guided_tour
    allow_virtual_tour = tour_setting&.allow_virtual_tour
    tour_type = params['tour_type'] if params['tour_type'].present?
    self_tour = tour_type == "self_tour" && allow_self_tour
    guided_tour = tour_type == "guided_tour" && allow_guided_tour
    virtual_tour = tour_type == "virtual_tour" && allow_virtual_tour
    if self_tour or guided_tour or virtual_tour
      if self_tour
        # binding.pry
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
        render json: { is_success: true, error_code: 400, message: "No Date is available to schedule tour", data: nil }
      end
    else
      render json: { is_success: true, error_code: 400, message: "Tour type does not match to allowed tours", data: nil }
    end  
  end
  
  private

  def date_of_next(day)
    date  = Date.parse(day)
    delta = date > Date.today ? 0 : 7
    date + delta
  end
  
  def find_community
    # community_id = JsonWebToken.decode(params[:property_code])
    @community = Community.joins(:tour).where('tours.only_scheduled_tour = ?',true).self_tour_enabled_only.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { is_success: false, error_code: 400, message: "Community not found.", data: nil }, status: :not_found
  end

  def authorize_params
    params.permit(:api_access_key)
  end
  
  def authenticate_token!
    payload = JsonWebToken.decode(auth_token)
    render json: {is_success: false, error_code: 400, message: "Invalid auth token", data: nil } if vender_api_access_key != payload["sub"] 
    rescue JWT::DecodeError
      render json: {is_success: false, error_code: 400, message: "Invalid auth token", data: nil }
  end

  def auth_token
    @auth_token ||= request.headers['Authorization']
  end

  def vender_api_access_key
    ENV['APPARTMENTS.COM_API_KEY_ACCESS']
  end

end
