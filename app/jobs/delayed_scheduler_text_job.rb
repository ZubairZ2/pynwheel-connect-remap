class DelayedSchedulerTextJob < ApplicationJob
  include SuckerPunch::Job

  def perform(msg, to)
      
  prod_from = ENV["TWILIO_FROM_PHONE_NUMBER"]
  account_sid = ENV["TWILIO_ACCOUNT_SID"]
  auth_token = ENV["TWILIO_AUTH_TOKEN"]
  @client = Twilio::REST::Client.new(account_sid, auth_token)
  
  
  message = @client.messages
    .create( 
      body: msg,
      from: prod_from,
      to: to
    )
  end
end