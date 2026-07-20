class TwilioSmsWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'message', retry: 1

  def perform(message_body, to_phone_number, tour_user_email = nil, community_id = nil)
    return unless NotificationValidatorService.new(tour_user_email, community_id).validate_recipient
    deliver_text_message(message_body, to_phone_number)
  end

  private

    def deliver_text_message message_body, to_phone_number
      from_phone_number = ENV["TWILIO_FROM_PHONE_NUMBER"]
      account_sid = ENV["TWILIO_ACCOUNT_SID"]
      auth_token = ENV["TWILIO_AUTH_TOKEN"]
      @client = Twilio::REST::Client.new(account_sid, auth_token)
      
      @client.messages.create( 
        body: message_body,
        from: from_phone_number,
        to: to_phone_number
      )
    rescue => error
      raise error
    end
  
end