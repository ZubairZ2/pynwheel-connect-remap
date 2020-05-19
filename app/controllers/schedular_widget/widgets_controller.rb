class SchedularWidget::WidgetsController < ApplicationController
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

  def test_widget
    @community_id = params[:community_id]
    @community = Community.find params[:community_id]
    flash[:success] = params[:message] if params[:message].present?
    
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

    @visiting_times = @community.opening_hours.map{|day_obj| [day_obj.day, day_obj.opening_time , day_obj.closing_time] }
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
