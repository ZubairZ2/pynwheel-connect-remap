# == Schema Information
#
# Table name: tour_histories
#
#  id                     :integer          not null, primary key
#  arrived                :datetime
#  left                   :datetime
#  id_mismatch            :boolean
#  abandoned_tour_at_stop :integer
#  tour_user_id           :integer
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  lengthy_stay           :datetime
#

class TourHistory < ApplicationRecord
	attr_accessor :community

  belongs_to :tour_user
  has_many :lock_histories, dependent: :destroy

  after_create :send_arrival_notifications
  after_update :send_update_notifications



  private

  def send_arrival_notifications
  	send_email_sms_or_both ["Visitor Has Arrived", "A Pynwheel Self Tour has begun for: \n #{self.tour_user.name} \n #{self.tour_user.email}"]
  end

  def send_update_notifications
  	if time_difference >= 60 && self.lengthy_stay_email_sent == false
  		@mail_content = get_alert_message('lengthy_stay')
  		@mail_content[1] = "#{@mail_content.last} #{plural(time_difference, 'minute')}"
      self.update_attributes(lengthy_stay_email_sent: true)
  		send_email_sms_or_both @mail_content
  	end

  	if self.id_mismatch
  		@mail_content = get_alert_message('id_mismatch')
  		send_email_sms_or_both @mail_content
  	end

  	if self.left && self.end_tour_email_sent == false
  		@mail_content = get_alert_message('tour_has_ended')
      url = Rails.env.production? ? "https://pynwheelapp.com/communities/#{@community.id}/tour%5Fusers" : "https://pynwheel-staging.herokuapp.com/communities/#{@community.id}/tour%5Fusers"
  		@mail_content[1] = "#{@mail_content.last} \n #{self.tour_user.name} \n #{self.tour_user.email}"+ "<br><br>See Tour Summary <a href='#{url}'>Click Here</a>"
  		self.update_attributes(end_tour_email_sent: true)
		touruser_remotelock_data(self.arrived,self.left)
      send_email_sms_or_both @mail_content
      # community.deleted_ids = []
      community.save
  	end

  	if self.abandoned_tour_at_stop.present? && self.abandoned_tour_email_sent == false
  		@mail_content = get_alert_message('abandoned_tour_at_stop')
  		@mail_content[1] = "#{@mail_content.last} stop #{self.abandoned_tour_at_stop.to_s}"
		self.update_attributes(abandoned_tour_email_sent: true)
		touruser_remotelock_data(self.arrived,self.lengthy_stay)
      send_email_sms_or_both @mail_content
      # community.deleted_ids = []
      community.save
  	end
  end
  
	def touruser_remotelock_data(start_time,end_time)
		community = (Tour.find self.tour_id).community
		as_guests_data = self.tour_user.as_guests.find_by(community_id: community.id)
		if as_guests_data.present?
			Thread.new do
				
				access_token = RemoteLockService.new(community).client_credentials
				page = 1

				while page <= 5 do
					responce = RemoteLockService.new(community).get_all_events(access_token,page)

					responce["data"].each do |event|
						if event["type"] == "unlocked_event" or event["type"] == "locked_event"
							if event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded"
								# if event["attributes"]["associated_resource_name"] == self.tour_user.name and event["attributes"]["pin"] == "5705"
								if event["attributes"]["associated_resource_id"].present? and event["attributes"]["associated_resource_id"] == as_guests_data.guest_id
									occurred_at = (event["attributes"]["occurred_at"].to_datetime - 5.hours) # remote is using "America/Chicago" timezone that's why -5 hours
									# occurred_at = (event["attributes"]["occurred_at"].to_datetime)

									puts '---'*50
									puts occurred_at
									puts start_time
									puts end_time
									puts '---'*50
									
									if occurred_at >= start_time and occurred_at <= end_time

										event_type = event["type"]
										lock_id = event["attributes"]["publisher_id"]
										lock_type = event["attributes"]["publisher_type"]
										rml = RemoteLock.find_by(device_id: lock_id) 

										self.lock_histories.create(event: event_type, occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id)
									end
								elsif event["attributes"]["associated_resource_name"] == self.tour_user.name and event["attributes"]["method"] == "pin" and event["attributes"]["pin"].present?
									# this check is for testing because remote locks set expires user data after some time causing not showing their ids
									# it might cause error - stay alert

									occurred_at = (event["attributes"]["occurred_at"].to_datetime - 5.hours) # remote is using "America/Chicago" timezone that's why -5 hours
									# occurred_at = (event["attributes"]["occurred_at"].to_datetime)

									puts '---'*50
									puts occurred_at
									puts start_time
									puts end_time
									puts '---'*50
									
									if occurred_at >= start_time and occurred_at <= end_time

										event_type = event["type"]
										lock_id = event["attributes"]["publisher_id"]
										lock_type = event["attributes"]["publisher_type"]
										rml = RemoteLock.find_by(device_id: lock_id) 

										self.lock_histories.create(event: event_type, occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id)
									end
								end
							end
						end
					end
					page = page + 1
				end
			end
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

		# account_sid = 'ACcd5341bccaa0000972f42fded7122d87'
		# auth_token = 'b3bdde4cf7d6d4b61a7065580920bd53'

		# @client = Twilio::REST::Client.new(account_sid, auth_token)

		# message = @client.messages
		#   .create( 
		#   	body: message_body,
		#     from: '+12017012957',
		#     to: community.phone
		#   )
  end

  def send_email subj, body
		begin
			NotificationMailer.tour_history_mail(subj.humanize, body.humanize, community.email).deliver
		rescue

		end
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
