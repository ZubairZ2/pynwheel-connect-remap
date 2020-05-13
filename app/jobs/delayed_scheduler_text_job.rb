class DelayedSchedulerTextJob < ApplicationJob
  include SuckerPunch::Job

  def perform(msg, to)
      
  prod_from = '+12017012957'
  account_sid = 'AC100385e8559f1ad63a5dbfaa3272a8d5'
  auth_token = '1f768aeab1be375bfe8da7a5e7310e74'
  @client = Twilio::REST::Client.new(account_sid, auth_token)
  
  
  message = @client.messages
    .create( 
      body: msg,
      from: prod_from,
      to: to
    )
  end
end