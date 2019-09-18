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
    flash[:success] = params[:message] if params[:message].present?

    render :test_widget, layout: false
  end

  private
  
  def allow_iframe
    response.headers.except! 'X-Frame-Options'
  end
end
