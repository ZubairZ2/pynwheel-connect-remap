class TwilioSmsService < BaseService
  def initialize
  end

  def send_sms(message_body, twilio_to_phone_number)
    client = create_client()
    send_sms_to_client(client, message_body, twilio_to_phone_number)
  end

  private

  def create_client
    sid = "AC100385e8559f1ad63a5dbfaa3272a8d5" 
    auth = "1f768aeab1be375bfe8da7a5e7310e74"
    Twilio::REST::Client.new(sid, auth)
  end

  def send_sms_to_client client, message_body, twilio_to_phone_number
    from = "+12017012957"

    client.messages
      .create( 
        body: message_body,
        from: from,
        to: twilio_to_phone_number
      )
  end

end