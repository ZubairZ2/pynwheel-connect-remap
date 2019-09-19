class TourHistory < ApplicationRecord
	attr_accessor :community

  belongs_to :tour_user

  after_create :send_arrival_notifications
  after_update :send_update_notifications



  private

  def send_arrival_notifications
  	send_email_sms_or_both ["Visitor Has Arrived", "Tour has begun"]
  end

  def send_update_notifications
  	
  	if time_difference >= 10
  		@mail_content = get_alert_message('lengthy_stay')
  		@mail_content[1] = "#{@mail_content.last} #{plural(time_difference, 'minute')}"

  		send_email_sms_or_both @mail_content
  	end

  	if self.id_mismatch
  		@mail_content = get_alert_message('id_mismatch')
  		send_email_sms_or_both @mail_content
  	end

  	if self.left
  		@mail_content = get_alert_message('left')
  		@mail_content[1] = "#{@mail_content.last}, spending #{time_distance} on site."
  		send_email_sms_or_both @mail_content
  	end

  	if self.abandoned_tour_at_stop.present?
  		@mail_content = get_alert_message('abandoned_tour_at_stop')
  		@mail_content[1] = "#{@mail_content.last} stop #{self.abandoned_tour_at_stop.to_s}"
  		send_email_sms_or_both @mail_content
  	end
  end
  	
  def send_email_sms_or_both mail_content
  	if community.alert_contact == "email"
  		send_email mail_content[0], mail_content[1]
  	elsif community.alert_contact == "phone"
  		send_sms mail_content[1]
  	else
  		send_email mail_content[0], mail_content[1]
  		send_sms mail_content[1]
  	end
  end


  def send_sms message_body
		# DANGER! This is insecure. See http://twil.io/secure
		# binding.pry
		# to: '+923236808910'
		
		# account_sid = 'AC100385e8559f1ad63a5dbfaa3272a8d5'
		# auth_token = '1f768aeab1be375bfe8da7a5e7310e74'
		# @client = Twilio::REST::Client.new(account_sid, auth_token)

		# message = @client.messages
		#   .create( 
		#   	body: message_body,
		#     from: '+12017012957',
		#     to: community.phone
		#   )
    
  end

  def send_email subj, body
  	NotificationMailer.tour_history_mail(subj.humanize, body.humanize, community.email).deliver
  end

  
  def time_difference
  	((Time.zone.now - self.arrived) / 1.minute).round
  end

  def get_alert_message key
		message_data = AlertMessage.where(message_key: key).pluck(:message_key, :message_body).flatten  	
  end

  def plural count, str
  	ActionController::Base.helpers.pluralize(count, str)
  end

  def time_distance
  	ActionController::Base.helpers.distance_of_time_in_words self.arrived, self.left
  end


end
