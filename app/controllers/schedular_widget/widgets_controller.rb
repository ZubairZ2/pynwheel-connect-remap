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
    render :test_widget, layout: false
  end

  def payment
    begin
      customer = Stripe::Customer.create email: params[:tour_user][:email],
                                         card: params[:tour_user][:card_token]
      # binding.pry
      Stripe::Charge.create customer: customer.id,
                            amount: 20 * 100,
                            description: "Escrow Payment",
                            currency: 'usd'
    rescue Exception => e
      flash[:error] = e.message
      # render json: {message: e.message}, status: 'failed' and return
    end

    render json: {message: "Tour Scheduled"}, status: 200
  end

  private
  
  def allow_iframe
    response.headers.except! 'X-Frame-Options'
  end
end
