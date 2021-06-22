class Api::V1::SalesforceWebhooksController < ActionController::Base

  def salesforce_tour_webhook
    puts "------------------------------"*50
    puts "Salesforce Webhook"
    puts params.inspect
    puts "------------------------------"*50
    render :json => {:success=>true, :message => "Salesforce tour submitted successfully", :status => 200}
  end
end