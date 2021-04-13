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
  attr_accessor :length_stay_limit

  belongs_to :tour_user
  has_many :lock_histories, dependent: :destroy
	include DweloDevicesHelper

  after_create :send_arrival_notifications
  after_update :send_update_notifications


  private

  def send_arrival_notifications
  	send_email_sms_or_both ["Visitor Has Arrived", "A Pynwheel Self Tour has begun for: \n #{self.tour_user.name} \n #{self.tour_user.email}"]
  end

  def send_update_notifications
    if self.history != true
      if time_difference >= 90 && self.lengthy_stay_email_sent == false
        @mail_content = ["lengthy_stay", "Visitor is on site for more than one hour.", "lengthy_stay", "#{self.tour_user.name.capitalize} has been on a Self Tour at #{@community.name.gsub("(", "( ").split.map(&:capitalize).join(' ')} for more than"] #get_alert_message('lengthy_stay')
        @mail_content[1] = "#{@mail_content.last} #{plural(time_difference, 'minute')}"
        self.update_attributes(lengthy_stay_email_sent: true)
        send_email_sms_or_both @mail_content
      end

      if self.id_mismatch and !self.is_left
        community = (Tour.find_by_id self.tour_id).community
        vs = self.tour_user
        url = Rails.env.production? ? "https://pynwheelconnect.com/id_selfie_matching/#{vs.id }?community=#{community.id}" : "https://pynwheel-staging.herokuapp.com/id_selfie_matching/#{vs.id }?community=#{community.id}"
        @mail_content = ["id_mismatch", "The photo ID/selfie for #{vs.name} were flagged as a mis-match <br/> <a href='#{url}' target='_blank'> Visitor's ID page </a>"] #get_alert_message('id_mismatch')
        send_email_sms_or_both @mail_content
      end

      if self.left and !self.is_left
        community = (Tour.find_by_id self.tour_id).community
        self.update_columns(is_left: true)
        @mail_content = ["tour_has_ended", "A Pynwheel Self Tour has ended for:"] #get_alert_message('tour_has_ended')
        url = Rails.env.production? ? "https://pynwheelapp.com/communities/#{community.id}/tour%5Fusers" : "https://pynwheel-staging.herokuapp.com/communities/#{community.id}/tour%5Fusers"
        @mail_content[1] = "#{@mail_content.last} \n #{self.tour_user.name} \n #{self.tour_user.email}" + "<br><br>See Tour Summary <a href='#{url}'>Click Here</a>"

        touruser = self.tour_user

        if touruser.tour_type === "self_tour"
          scheduled_tour = MaxDateScheduledTourService.new(tour_user, community, false).get_scheduled_tour
          
          if scheduled_tour.present? && is_tour_on_time(scheduled_tour, community)
            scheduled_tour.update(is_tour_completed: true) if scheduled_tour.present?
          end
        end 

        tour_user_url = Rails.env.production? ? "https://pynwheelapp.com/communities/#{@community.id}/tour%5Fusers/#{touruser.id}" : "https://pynwheel-staging.herokuapp.com/communities/#{@community.id}/tour%5Fusers/#{touruser.id}"
        @complete_tour_content = ["#{@community.name} has been visited", "#{touruser.name.capitalize} (#{touruser.email}#{', ' + touruser.phone_number if touruser.phone_number.present?}) has completed a tour of your property! To view the details of their visit, please click here: <a href='#{tour_user_url}'>#{touruser.name.capitalize} Visitor Details</a> "]
        @thank_you_content = @community.thank_you_message.present? ? @community.thank_you_message : "Thank you for visiting #{@community.name}! We hope you enjoyed your tour. Go back to the Pynwheel Self Tour app any time to review the details of your tour."
        touruser_remotelock_data

        # tour = (Tour.find_by_id self.tour_id)
        # assigned_pin = self.tour_user.as_guests.find_by(community_id: tour.community.id).edgestate_pin if tour.present? and self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
        # ImportRemotelockEventsJob.perform_in(2.5.minute.seconds.to_i, self.tour_user, self, assigned_pin) if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
        # ImportRemotelockEventsWorker.perform_at(30.minutes.from_now, self.tour_user.id.to_s, self.id.to_s, assigned_pin)
        # email_content = "Events for #{self.tour_user.name} with tour id #{self.tour_user.id} are imported in pynwheel, while the tour history id is #{self.id} and the assigned pin is #{assigned_pin}" if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
        # DelayedSchedulerMailerJob.perform_async("Remote Lock Events", email_content, "humza4142@gmail.com","Lock History has been imported","check the database, its ran in callback","humza4142@gmail.com") if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?

        send_email_sms_or_both @mail_content
        send_email_sms_or_both @complete_tour_content
        send_email_sms_or_both_to_touruser @thank_you_content
        # community.deleted_ids = []


        if community.credential.present? and community.credential.crm_provider == "salesforce"
          current_tour = VisitedStop.where(tour_user_id: tour_user.id, tour_id: self.tour_id).last
          if current_tour.present?
            # current_tour.tour_key = "450e96530bb8ae7af1b3f3d019a6a055" # testing line
            Prospect.where(community_id: community.id, tour_user_id: tour_user.id, crm_provider: "salesforce", sf_status: "active").update_all(tour_key: current_tour.tour_key)
            community.send_feedback_to_salesforce(tour_user, self)
          end
        else
          save_prospect(self.left)
        end
        community.save
      end

      # if self.abandoned_tour_at_stop.present?

      #   @mail_content = ["abandoned_tour_at_stop", "A tour was abandoned before it was completed at "] #get_alert_message('abandoned_tour_at_stop')
      #   @mail_content[1] = "#{@mail_content.last} stop #{(TourStop.find self.abandoned_tour_at_stop.to_i).name rescue "Not Found"}."
      #   @thank_you_content  = @community.thank_you_message.present? ? @community.thank_you_message : "Thank you for visiting #{@community.name}! We hope you enjoyed your tour. Go back to the Pynwheel Self Tour app any time to review the details of your tour."
      #   touruser_remotelock_data

      #   # tour = (Tour.find_by_id self.tour_id)
      #   # assigned_pin = self.tour_user.as_guests.find_by(community_id: tour.community.id).edgestate_pin if tour.present? and self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
      #   # ImportRemotelockEventsJob.perform_in(2.5.minute.seconds.to_i, self.tour_user, self, assigned_pin) if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
      #   # ImportRemotelockEventsWorker.perform_at(30.minutes.from_now, self.tour_user.id.to_s, self.id.to_s, assigned_pin)

      #   # email_content = "Events for #{self.tour_user.name} with tour id #{self.tour_user.id} are imported in pynwheel, while the tour history id is #{self.id} and the assigned pin is #{assigned_pin}" if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
      #   # DelayedSchedulerMailerJob.perform_async("Remote Lock Events", email_content, "humza4142@gmail.com","Lock History has been imported","check the database, its ran in callback","humza4142@gmail.com") if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?

      #   send_email_sms_or_both @mail_content
      #   send_email_sms_or_both_to_touruser @thank_you_content
      #   # community.deleted_ids = []
      #   save_prospect(self.lengthy_stay)
      #     community.save
      # end

    end
  end

  def is_tour_on_time(scheduled_tour, community, timezone = nil)
    tour = community.tour

    if tour.grace_period.present?
      if community.present? && community.latitude.present? && community.longitude.present?
        timezone = get_time_zone(community)
      end


      timezone = timezone || scheduled_tour.user_time_zone
      grace_period = tour.grace_period
      current_time = Time.now.in_time_zone(timezone)
      tour_date_time = (scheduled_tour.tour_date.to_s + " " + scheduled_tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone)

      before_margin = current_time - grace_period.minutes
      after_margin = current_time + grace_period.minutes

      if tour_date_time > before_margin && tour_date_time < after_margin
        true
      else
        false
      end
    else
      false
    end
  end

  def get_time_zone(community)
    time_zone = Timezone.lookup(community.latitude, community.longitude)
    timezone = time_zone.name
  end

  def save_prospect(endtime)
    end_time = endtime.in_time_zone(self.my_time_zone)
    tour_time = self.arrived.in_time_zone(self.my_time_zone)
    tour_status = self.tour_status.present? ? self.tour_status : "virutal"

    available_stops = avail_stops_name_of_community
    visited_stops = stop_marketing_names_visited_by_user
    data_provider = @community.use_crm_credentials? ? @community.crm_credential.crm_provider : @community.data_provider
    if data_provider == "realpagesvc"
      RealPageGuestCardIntegrationJob.perform_async(@community.credential.attributes.to_json, self.tour_user, tour_time, end_time, tour_status, available_stops, visited_stops,@community)
    elsif data_provider == "psi"
      @community.entrata_send_mits_leads(self.tour_user, tour_time, end_time, visited_stops)
    end
  end

	def touruser_remotelock_data
		community = (Tour.find_by_id self.tour_id).community
		as_guests_data = self.tour_user.as_guests.find_by(community_id: community.id)

		if as_guests_data.present?
			Thread.new do
				access_token = RemoteLockService.new(community).client_credentials
				if access_token.present?
				page = 1
				while page <= 5 do
					responce = RemoteLockService.new(community).get_all_events(access_token,page)
					responce["data"].each do |event|
						if active_user_exists(event,as_guests_data.guest_id)

							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							self.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
						
						elsif expire_user_exists(event, tour_user.name, as_guests_data.edgestate_pin)
							
							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							self.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
				
						elsif sync_events_exists(event,as_guests_data.guest_id) # just for testing
							
							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							self.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
						
						end
					
					end
					page = page + 1
				end
				else
					access_token = dwelo_client_credentials(community.dwelo)
					page = 1
					responce = RemoteLockService.new(community).get_dwelo_events(access_token,as_guests_data.guest_id)
					responce["data"].each do |event|
						if dwelo_active_user_exists(event,as_guests_data.guest_id)

							occurred_at = event["timestamp"].to_datetime.strftime('%a, %d %b %Y %H:%M:%S').to_datetime
							rml = RemoteLock.find_by(device_id: event["lock_id"])
							self.lock_histories.create(event: event["event_type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?

						end

					end
				end
			end
		end
	end
  
  def send_email_sms_or_both mail_content
    if self.history != true
      community = (Tour.find_by_id self.tour_id).community unless community.present?
      if community.alert_contact == "email" or community.alert_contact == "phone"
        if mail_content[0] == "#{community.name} has been visited"
          send_email_without_humanize mail_content[0], mail_content[1]
          send_sms mail_content[1]
        else
          send_email mail_content[0], mail_content[1]
          send_sms mail_content[1]
        end
      else
        if mail_content[0] == "#{community.name} has been visited"
          send_email_without_humanize mail_content[0], mail_content[1]
          send_sms mail_content[1]
        else
          send_email mail_content[0], mail_content[1]
          send_sms mail_content[1]
        end
      end
    end
  end

  def send_email_sms_or_both_to_touruser thank_you_msg
  	if community.alert_contact == "email"
  		send_email_tour_user "Thank you for visiting #{community.name}","<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.self_tour_logo.present? ? community.self_tour_logo.url : ''}' data-title='#{community.name}' /></div><br/> " + thank_you_msg.gsub("\n", "<br>").html_safe, community.email
  	elsif community.alert_contact == "phone"
  		send_sms_tour_user thank_you_ms
  	else
  		send_email_tour_user "Thank you for visiting #{community.name}","<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.self_tour_logo.present? ? community.self_tour_logo.url : ''}' data-title='#{community.name}' /></div><br/> " + thank_you_msg.gsub("\n", "<br>").html_safe, community.email
  		send_sms_tour_user thank_you_msg
  	end
  end

  def send_sms message_body
	# begin
	# 	DelayedSchedulerTextJob.perform_async(message_body, community.phone) if community.phone.present?
	# rescue
	# end
  end

  def send_email subj, body
    begin
      emails = community.email.gsub(" ","").split(',')
      emails.each do |email|
        NotificationMailer.tour_history_mail(subj.humanize, body, email).deliver
      end
      # NotificationMailer.tour_history_mail(subj.humanize, body, community.email).deliver
    rescue

    end
  end

  def send_email_without_humanize subj, body
    begin
      emails = community.email.gsub(" ","").split(',')
      emails.each do |email|
        NotificationMailer.tour_history_mail(subj.humanize, body, email).deliver
      end
    rescue

    end
  end

  def send_email_to_user_without_humanize subj, body , community_email=nil
    begin
      emails = community_email.gsub(" ","").split(',')
      NotificationMailer.tour_history_mail(subj, body, self.tour_user.email, email[0]).deliver
    rescue

    end
  end

  def send_sms_tour_user message_body
    begin
      DelayedSchedulerTextJob.perform_async(message_body, self.tour_user.phone_number) if self.tour_user.phone_number.present?
    rescue
    end
  end

  def send_email_tour_user subj, body, community_email
    begin
      emails = community_email.gsub(" ","").split(',')
      NotificationMailer.tour_history_mail(subj.humanize, body, self.tour_user.email, emails[0]).deliver
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

  def active_user_exists(event, guest_id)
    return (event["type"] == "unlocked_event" and event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded" and event["attributes"]["associated_resource_id"].present? and event["attributes"]["associated_resource_id"] == guest_id)
  end

  def expire_user_exists(event, name, pin)
    return (event["type"] == "unlocked_event" and event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded" and event["attributes"]["associated_resource_name"] == name and event["attributes"]["method"] == "pin" and event["attributes"]["pin"] == pin)
  end

  def sync_events_exists(event,guest_id)
    return (event["type"] == "access_person_synced_event" and event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded" and event["attributes"]["associated_resource_id"].present? and event["attributes"]["associated_resource_id"] == guest_id)
  end
  
	def dwelo_active_user_exists(event,guest_id)
		return (event["event_type"] == "app_unlock"  and  event["access_person_id"] == guest_id)
  end
  
	def avail_stops_name_of_community
		# stops_arr = @community.mdu ? @community.tour.tour_stops.where(display_stop: true).order(:sort) :  @community.tour.tour_stops.where(display_stop: true,stop_type: "amenity").order(:sort)
		# allowed_stops = TourStop.where(id: stops_arr.ids).pluck(:stop_type, :stop_id)

        tour_stops = []
        # allowed_stops.each do |stop|
        #   if stop[0] == "unit"
        #     unit = stop[0].classify.constantize.find_by_id stop[1]
        #     if unit.building.present?
        #       name = unit.building + "-" + unit.name
        #     else
        #       name = unit.name
        #     end
        #     tour_stops << name if unit.present?
        #   elsif stop[0] == "amenity"
        #     amentiy = stop[0].classify.constantize.find_by_id stop[1]
        #     tour_stops << amentiy.name if amentiy.present?
        #   end
		# end
		return tour_stops
	end

	def stop_marketing_names_visited_by_user
		visited_stops = []

		current_tour = VisitedStop.where(tour_user_id: self.tour_user_id, tour_id: self.tour_id).last
		tour_key = current_tour.tour_key if current_tour.present?
		if tour_key.present?
			tour_stop_ids = VisitedStop.where(tour_key: tour_key).pluck(:tour_stop_id)
			unit_stops = TourStop.where(id: tour_stop_ids, stop_type: "unit").pluck(:stop_id)

			unit_stops.each do |stop_id|
				unit = Unit.find_by_id stop_id
				marketing_name = unit.marketing_name
				visited_stops << marketing_name if unit.present?
			end
		end
		puts "visited_stops"
		puts visited_stops
		return visited_stops
	end
end