class SchedulerWidget::WidgetsController < ApplicationController
	skip_before_action :verify_authenticity_token
  skip_before_action :authenticate_user!
  after_action :allow_iframe
  layout 'widget'

  def widget
    respond_to do |format|
      format.html do
        # load data to show in the view
        @data = User.take 10
        render :widget
      end
      format.js do
        render :widget_layout
      end
    end
  end
  def scheduler_widget_button
    
    @schedule_widget_setting= SchedulerWidgetSetting.find params[:id]
    @community_code = params[:community_code]
    @community = Community.find params[:community_id]
    render :scheduler_widget_button, layout: false
  end

  def test_widget
    @tour_user = params[:tour_user_id].present? ? TourUser.find_by_id(params[:tour_user_id]) : TourUser.new
    @community_id = params[:community_id]
    @community = Community.find params[:community_id]
    @credit_card_required =  @community.tour.credit_card_required
    @bedroom_list = @community.floorplans.map{|x| x.bedrooms.to_i}.uniq
    @marketing_source_required = @community.tour.marketing_source_required
    if params[:direct].present?
      @direct =  true
      params[:message].present? ? @show_first = false : @show_first = true
      decoded = JWT.decode params[:community_code], ENV['SECRET_KEY_BASE_v2'], true, { algorithm: 'HS256' } rescue nil
      unless decoded[0]["community_id"].to_i == params[:community_id].to_i
        raise ActionController::RoutingError.new('Not Found')
      end
    else
      @direct =  false
    end
    if @community.opening_hours.present?
      @disable_day_of_week = [0,1,2,3,4,5,6]
      @community.opening_hours.each do |rcd|
        if rcd.day == "Sunday"
          @disable_day_of_week = @disable_day_of_week - [0]
        elsif rcd.day == "Monday"
          @disable_day_of_week = @disable_day_of_week - [1]
        elsif rcd.day == "Tuesday"
          @disable_day_of_week = @disable_day_of_week - [2]
        elsif rcd.day == "Wednesday"
          @disable_day_of_week = @disable_day_of_week - [3]
        elsif rcd.day == "Thursday"
          @disable_day_of_week = @disable_day_of_week - [4]
        elsif rcd.day == "Friday"
          @disable_day_of_week = @disable_day_of_week - [5]
        elsif rcd.day == "Saturday"
          @disable_day_of_week = @disable_day_of_week - [6]
        end
      end
    else
      @disable_day_of_week = []
    end
    
    @stepping = @community.tour.tour_setting.time_intervel == '15 min' ? 15 : (@community.tour.tour_setting.time_intervel == '30 min' ? 30 : (@community.tour.tour_setting.time_intervel == '1 hr') ? 60 : (@community.tour.tour_setting.time_intervel == '2 hrs') ? 120 : 15) rescue 15
    cutt_of = @stepping < 60 ? @stepping.to_s + " minutes" : (@stepping == 60 ? "1 hour" : "2 hours")
    # @visiting_times = @community.opening_hours.map{|day_obj| [day_obj.day, day_obj.opening_time , day_obj.closing_time] }
    @visiting_times = @community.opening_hours.map{|day_obj| [day_obj.day, day_obj.opening_time , (Time.parse(day_obj.closing_time) - (@stepping.minutes)).strftime("%H:%M")] }
    @guided_visiting_times = @community.guided_opening_hours.map{|day_obj| [day_obj.day, day_obj.opening_time , (Time.parse(day_obj.closing_time) - (@stepping.minutes)).strftime("%H:%M")] }
    @error_message = []
    day_hash = {}
    @community.opening_hours.each do |day_obj|
      day_hash[day_obj.day] = day_hash[day_obj.day].present? ? day_hash[day_obj.day] + ', ' + Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + Time.parse(day_obj.closing_time).strftime("%I:%M %p") : Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + Time.parse(day_obj.closing_time).strftime("%I:%M %p")
      # day_hash[day_obj.day] = day_hash[day_obj.day].present? ? day_hash[day_obj.day] + ', ' + Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + (Time.parse(day_obj.closing_time) - @stepping.minutes).strftime("%I:%M %p") : Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + (Time.parse(day_obj.closing_time) - @stepping.minutes).strftime("%I:%M %p")
      message = []
      message[0] = day_obj.day
      message[1] = '(visiting hours for ' +  day_obj.day + ' are from ' + day_hash[day_obj.day] +'). The last tour must be scheduled ' + cutt_of +' before visiting hours end.'
      @error_message << message
    end
    @community.guided_opening_hours.each do |day_obj|
      day_hash[day_obj.day] = day_hash[day_obj.day].present? ? day_hash[day_obj.day] + ', ' + Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + Time.parse(day_obj.closing_time).strftime("%I:%M %p") : Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + Time.parse(day_obj.closing_time).strftime("%I:%M %p")
      # day_hash[day_obj.day] = day_hash[day_obj.day].present? ? day_hash[day_obj.day] + ', ' + Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + (Time.parse(day_obj.closing_time) - @stepping.minutes).strftime("%I:%M %p") : Time.parse(day_obj.opening_time).strftime("%I:%M %p") + ' to ' + (Time.parse(day_obj.closing_time) - @stepping.minutes).strftime("%I:%M %p")
      message = []
      message[0] = day_obj.day
      message[1] = '(guided visiting hours for ' +  day_obj.day + ' are from ' + day_hash[day_obj.day] +'). The last tour must be scheduled ' + cutt_of +' before visiting hours end.'
      @error_message << message
    end
    flash[:success] = params[:message] if params[:message].present?
    render :test_widget, layout: false
  end

  def change_tour_time_widget
    @schedule_tour = SchedualTour.find params[:id]
    @community = Community.find @schedule_tour.community_id
  end

  private
  
  def allow_iframe
    response.headers.except! 'X-Frame-Options'
  end
end
