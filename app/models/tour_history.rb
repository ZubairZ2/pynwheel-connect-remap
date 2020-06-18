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

  	if self.left
  		@mail_content = get_alert_message('tour_has_ended')
      url = Rails.env.production? ? "https://pynwheelapp.com/communities/#{@community.id}/tour%5Fusers" : "https://pynwheel-staging.herokuapp.com/communities/#{@community.id}/tour%5Fusers"
  		@mail_content[1] = "#{@mail_content.last} \n #{self.tour_user.name} \n #{self.tour_user.email}"+ "<br><br>See Tour Summary <a href='#{url}'>Click Here</a>"

		touruser_remotelock_data
		tour = (Tour.find_by_id self.tour_id)
		assigned_pin = self.tour_user.as_guests.find_by(community_id: tour.community.id).edgestate_pin if tour.present? and self.tour_user.present? and self.tour_user.as_guests.present?
		ImportRemotelockEventsJob.perform_in(2.5.minute.seconds.to_i, self.tour_user, self, assigned_pin) if self.tour_user.present? and self.tour_user.as_guests.present?
		# ImportRemotelockEventsWorker.perform_at(30.minutes.from_now, self.tour_user.id.to_s, self.id.to_s, assigned_pin)
		
		email_content = "Events for #{self.tour_user.name} with tour id #{self.tour_user.id} are imported in pynwheel, while the tour history id is #{self.id} and the assigned pin is #{assigned_pin}" if self.tour_user.present? and self.tour_user.as_guests.present?
		DelayedSchedulerMailerJob.perform_async("Remote Lock Events", email_content, "humza4142@gmail.com","Lock History has been imported","check the database, its ran in callback","humza4142@gmail.com") if self.tour_user.present? and self.tour_user.as_guests.present?

		send_email_sms_or_both @mail_content
		# community.deleted_ids = []
		community.save
  	end

  	if self.abandoned_tour_at_stop.present?
  		@mail_content = get_alert_message('abandoned_tour_at_stop')
		  @mail_content[1] = "#{@mail_content.last} stop #{self.abandoned_tour_at_stop.to_s}"
		  
		touruser_remotelock_data
		tour = (Tour.find_by_id self.tour_id)
		assigned_pin = self.tour_user.as_guests.find_by(community_id: tour.community.id).edgestate_pin if tour.present? and self.tour_user.present? and self.tour_user.as_guests.present?
		ImportRemotelockEventsJob.perform_in(2.5.minute.seconds.to_i, self.tour_user, self, assigned_pin) if self.tour_user.present? and self.tour_user.as_guests.present?
		# ImportRemotelockEventsWorker.perform_at(30.minutes.from_now, self.tour_user.id.to_s, self.id.to_s, assigned_pin)

		email_content = "Events for #{self.tour_user.name} with tour id #{self.tour_user.id} are imported in pynwheel, while the tour history id is #{self.id} and the assigned pin is #{assigned_pin}" if self.tour_user.present? and self.tour_user.as_guests.present?
		DelayedSchedulerMailerJob.perform_async("Remote Lock Events", email_content, "humza4142@gmail.com","Lock History has been imported","check the database, its ran in callback","humza4142@gmail.com") if self.tour_user.present? and self.tour_user.as_guests.present?

		send_email_sms_or_both @mail_content
	    # community.deleted_ids = []
	    community.save
  	end
  end
  
	def touruser_remotelock_data
		
		community = (Tour.find_by_id self.tour_id).community
		as_guests_data = self.tour_user.as_guests.find_by(community_id: community.id)

		if as_guests_data.present?
			Thread.new do
				access_token = RemoteLockService.new(community).client_credentials

				page = 1
				while page <= 5 do
					responce = RemoteLockService.new(community).get_all_events(access_token,page)
					responce["data"].each do |event|
						if active_user_exists(event,as_guests_data.guest_id)

							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"])
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							self.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
						
						elsif expire_user_exists(event, tour_user.name, as_guests_data.edgestate_pin)
							
							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"])
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							self.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
				
						elsif sync_events_exists(event,as_guests_data.guest_id) # just for testing
							
							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"])
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							self.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
						
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

  def active_user_exists(event,guest_id)
    return (event["type"] == "unlocked_event" and event["attributes"]["source"] == "user" and  event["attributes"]["status"] == "succeeded" and event["attributes"]["associated_resource_id"].present? and event["attributes"]["associated_resource_id"] == guest_id)
  end
  
  def expire_user_exists(event,name,pin)
    return (event["type"] == "unlocked_event" and event["attributes"]["source"] == "user" and  event["attributes"]["status"] == "succeeded" and  event["attributes"]["associated_resource_name"] == name and event["attributes"]["method"] == "pin" and event["attributes"]["pin"] == pin)
  end

  def sync_events_exists(event,guest_id)
    return (event["type"] == "access_person_synced_event" and event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded" and event["attributes"]["associated_resource_id"].present? and event["attributes"]["associated_resource_id"] == guest_id)
  end
end
