class TwilioSmsService < BaseService
  def initialize
  end

  def send_sms(message_body, twilio_to_phone_number)
    client = create_client()
    send_sms_to_client(client, message_body, twilio_to_phone_number)
  end

  private

  def create_client
    sid = ENV["TWILIO_ACCOUNT_SID"]
    auth = ENV["TWILIO_AUTH_TOKEN"]
    Twilio::REST::Client.new(sid, auth)
  end

  def send_sms_to_client client, message_body, twilio_to_phone_number
    from = ENV["TWILIO_FROM_PHONE_NUMBER"]

    client.messages
      .create( 
        body: message_body,
        from: from,
        to: twilio_to_phone_number
      )
  end

end