class Api::V1::PerqWebhooksController < ActionController::Base

  def perq_tour_webhook
    puts "------------------------------"*50
    puts "PERQ Webhook Called"
    puts params.inspect
    puts "------------------------------"*50
    render :json => {:success=>true, :message => "PERQ tour submitted successfully", :status => 200}
  end
end