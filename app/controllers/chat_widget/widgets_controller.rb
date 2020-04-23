class ChatWidget::WidgetsController < ApplicationController
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

  def tour_user_widget
    # api hit
    # take params, maintain db, session/cookies
    @tour_id = 95
    @tour_user_id = params[:tour_user]
    cookies[:tour_user_id] = { value: @tour_user_id, expires:  12.hours.from_now }

    render :tour_user_widget, layout: false
  end

  def support_team_widget
    @chatrooms = Chatroom.all
    render :support_team_widget, layout: false
  end
  
  private
  
  def allow_iframe
    response.headers.except! 'X-Frame-Options'
  end
end
