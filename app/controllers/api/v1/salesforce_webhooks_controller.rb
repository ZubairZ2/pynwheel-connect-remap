class Api::V1::SalesforceWebhooksController < ActionController::Base

  def salesforce_tour_webhook
    puts "------------------------------"*50
    puts "Salesforce Webhook"
    puts params.inspect
    puts "------------------------------"*50
  end
end