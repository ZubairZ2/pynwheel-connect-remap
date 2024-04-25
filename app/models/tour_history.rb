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
    community = (Tour.find_by_id self.tour_id).community if self.tour_id.present?
    tour_type = self.tour_user.tour_type
  	verification_text = self.verified_by.present? ? "<br>They have successfully passed the ID verification process." : ""
    email_subject = self&.tour_user&.is_virtual_tour? ? "A virtual tour has begun" : "A tour has begun"
    if community.present?
      send_email_sms_or_both(["A tour has begun", "#{self.tour_user.name.titleize} has begun a tour of #{fetch_property_name(community.name)}." + verification_text] , community)
    end
  end

  def send_update_notifications
    community = (Tour.find_by_id self.tour_id).community if self.tour_id.present?
    touruser = self.tour_user
    scheduled_tour = community.schedual_tours.where(tour_user_id: touruser.id).last

    if community.present? && self.history != true
      if time_difference >= 90 && self.lengthy_stay_email_sent == false
        @mail_content = ["lengthy_stay", "Visitor is on site for more than one hour.", "lengthy_stay", "#{self.tour_user.name.titleize} has been on a Self Tour at #{community.name.gsub("(", "( ").split.map(&:capitalize).join(' ')} for more than"] #get_alert_message('lengthy_stay')
        @mail_content[1] = "#{@mail_content.last} #{plural(time_difference, 'minute')}"
        self.update_attributes(lengthy_stay_email_sent: true)
        send_email_sms_or_both(@mail_content, community) unless touruser.is_virtual_tour?
      end

      if self.left.present? and !self.is_left
        self.update_columns(is_left: true)
        @mail_content = ["tour_has_ended", "#{self.tour_user.name.titleize} has completed a tour of #{fetch_property_name(community.name)}}"] #get_alert_message('tour_has_ended')
        url = Rails.env.production? ? "https://pynwheelapp.com/communities/#{community.id}/tour%5Fusers" : "https://pynwheel-staging.herokuapp.com/communities/#{community.id}/tour%5Fusers"

        if touruser.tour_type == "self_tour" && (scheduled_tour&.property_tour_type.present? && scheduled_tour.property_tour_type == "scheduled_tour" )         
          if scheduled_tour.present? && is_tour_on_time(scheduled_tour, community)
            complete_scheduled_tour(scheduled_tour)
          end
        end 

        if touruser.tour_type == "virtual_tour" && (scheduled_tour&.property_tour_type.present? && (scheduled_tour.property_tour_type == "remote_tour" || scheduled_tour.property_tour_type == "unscheduled_self_tour"))
          complete_scheduled_tour(scheduled_tour)
        end

        if (touruser.tour_type == "virtual_tour" && (scheduled_tour&.tour_type == "Virtual tour" || scheduled_tour&.tour_type == "Virtual Tour")) || (touruser.tour_type == "self_tour" && (scheduled_tour&.tour_type == "Self guided" || scheduled_tour&.tour_type == "Self Guided"))
          complete_scheduled_tour(scheduled_tour)
        end

       complete_scheduled_tour(scheduled_tour) if scheduled_tour&.tour_type.present? && scheduled_tour&.created_by === "PERQ"

        tour_user_url = "https://#{Rails.env.production? ? 'pynwheelapp.com' : 'pynwheel-staging.herokuapp.com'}/communities/#{community.id}/tour_users/#{touruser.id}"

        @complete_tour_content = ["#{fetch_property_name(community.name)} has been visited", "#{touruser.name.titleize} (#{touruser.email}#{', ' + touruser.phone_number if touruser.phone_number.present?}) has completed a tour of your property! To view the details of their visit, please click here: <a href='#{tour_user_url}'>#{touruser.name.titleize} Visitor Details</a> "]
        
        if self.tour_user_id == 1445
          @thank_you_content = community.thank_you_message.present? ? community.thank_you_message : "completed Thank you for visiting #{fetch_property_name(community.name)}! We hope you enjoyed your tour. Go back to the Pynwheel Tour app any time to review the details of your tour."
        else
          @thank_you_content = community.thank_you_message.present? ? community.thank_you_message : "Thank you for visiting #{fetch_property_name(community.name)}! We hope you enjoyed your tour. Go back to the Pynwheel Tour app any time to review the details of your tour."
        end

        # @thank_you_content = append_app_links_with_emailbody(community, @thank_you_content)
        
        tour_user_remotelock_data(community)

        unless touruser.is_virtual_tour?
          send_email_sms_or_both(@mail_content, community)
          send_email_sms_or_both(@complete_tour_content, community)
        end
        
        send_email_sms_or_both_to_touruser(@thank_you_content, community)
        
        community.is_salesforce_community? ? save_salesforce_feedback_data(community, touruser) : save_prospect(self.left, community)
        visited_stops_data = stop_marketing_names_visited_by_user

        FunnelService.new(scheduled_tour).update_appointment_status("complete") if community.is_funnel_community?
        KnockService.new(scheduled_tour).create_knock_visit(visited_stops_data, self.left) if community.is_knock_community?
        upload_rent_cafe_leads_data(community, scheduled_tour, visited_stops_data)

        community.save
      end

      if self.abandoned_tour_at_stop.present?
        FunnelService.new(scheduled_tour).update_appointment_status("complete") if community.is_funnel_community?
        KnockService.new(scheduled_tour).create_knock_visit(visited_stops_data, get_current_time(community)) if community.is_knock_community?
        upload_rent_cafe_leads_data(community, scheduled_tour, visited_stops_data)

        save_salesforce_feedback_data(community, touruser) if community.is_salesforce_community?
      end

    end
  end

  def upload_rent_cafe_leads_data community, scheduled_tour, visited_stops_data
    return unless community.use_yardi_as_lead?

    if community&credential&.rentcafe_api_version == "RentCafe V2"
      YardiRentCafeV2Services::LeadsApiV2Service.new(scheduled_tour).upload_leads_data(visited_stops_data, self, true)
    else
      YardiRentCafeServices::LeadsApiService.new(scheduled_tour).upload_leads_data(visited_stops_data, self, true)
    end

  end

  def complete_scheduled_tour tour
    tour.update(is_tour_completed: true, tour_completed_at: get_current_time(tour&.community)) if tour.present?
  end

  def get_current_time community
    return Time.now unless community.present?

    Time.now.in_time_zone(community&.get_time_zone)
  end

  def save_salesforce_feedback_data community, tour_user
    current_tour = VisitedStop.where(tour_user_id: tour_user.id, tour_id: self.tour_id).last

    if current_tour.present?
      Prospect.where(community_id: community.id, tour_user_id: tour_user.id, crm_provider: "salesforce", sf_status: "active").update_all(tour_key: current_tour.tour_key)
      community.send_feedback_to_salesforce(tour_user, self)
    end
  end

  def is_tour_on_time(scheduled_tour, community, timezone = nil)
    tour = community.community_tour

    if  tour.only_scheduled_tour && tour.grace_period.present?
      timezone = community.get_time_zone()
      
      grace_period = tour.grace_period
      current_time = get_current_time(community)
      tour_date_time = (scheduled_tour.tour_date.to_s + " " + scheduled_tour.tour_time.strftime("%I:%M%p")).in_time_zone(timezone)

      before_margin = current_time - grace_period.minutes
      after_margin = current_time + grace_period.minutes

      if tour_date_time > before_margin && tour_date_time < after_margin
        true
      else
        false
      end
    else
      true
    end
  end

  def save_prospect(endtime, community)
    end_time = endtime.in_time_zone(self.my_time_zone)
    tour_time = self.arrived.in_time_zone(self.my_time_zone)
    tour_status = self.tour_status.present? ? self.tour_status : "virutal_tour"

    available_stops = []
    visited_stops = stop_marketing_names_visited_by_user
    data_provider = (community.use_crm_credentials? && community.crm_credential.present? && community.crm_credential.crm_provider.present?) ? community.crm_credential.crm_provider : community.data_provider
    
    if data_provider == "realpagesvc"
      RealPageGuestCardIntegrationJob.perform_async(community.credential.attributes.to_json, self.tour_user, tour_time, end_time, tour_status, available_stops, visited_stops,community)
    elsif data_provider == "psi"
      community.entrata_send_mits_leads(self.tour_user, tour_time, end_time, visited_stops)
    end
  end

	def tour_user_remotelock_data community
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
          @community = community
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

  def send_email_sms_or_both mail_content, community
    if self.history != true
      if community.alert_contact == "email" or community.alert_contact == "phone"
        if mail_content[0] == "#{fetch_property_name(community.name)} has been visited"
          send_email_without_humanize mail_content[0], mail_content[1], community
          send_sms mail_content[1]
        else
          send_email mail_content[0], mail_content[1],community
          send_sms mail_content[1]
        end
      else
        if mail_content[0] == "#{fetch_property_name(community.name)} has been visited"
          send_email_without_humanize mail_content[0], mail_content[1], community
          send_sms mail_content[1]
        else
          send_email mail_content[0], mail_content[1], community
          send_sms mail_content[1]
        end
      end
    end
  end

  def send_email_sms_or_both_to_touruser thank_you_msg, community
    content = (community.community_tour.tour_setting.enable_header_footer ? (thank_you_msg.gsub("\n", "<br>").html_safe) :  "<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.logo_for_email}' data-title='#{fetch_property_name(community.name)}' /></div><br/> " + (thank_you_msg.gsub("\n", "<br>").html_safe))
  	if community.alert_contact == "email"
      send_email_tour_user "Thank you for visiting #{fetch_property_name(community.name)}", content, community.email, community
  	elsif community.alert_contact == "phone"
  		send_sms_tour_user( thank_you_msg, community )
  	else
  		send_email_tour_user "Thank you for visiting #{fetch_property_name(community.name)}", content, community.email, community
  		send_sms_tour_user( thank_you_msg, community )
  	end
  end

  def send_sms message_body

  end

  def send_email subj, body, community
    begin
      emails = community.email.gsub(" ","").split(',')
      emails.each do |email|
        NotificationMailer.tour_history_mail(subj, body, email,"info@pynwheel.com",community,false,nil).deliver
      end
      # NotificationMailer.tour_history_mail(subj.humanize, body, community.email).deliver
    rescue

    end
  end

  def send_email_without_humanize subj, body, community
    begin
      emails = community.email.gsub(" ","").split(',')
      emails.each do |email|
        NotificationMailer.tour_history_mail(subj, body, email,"info@pynwheel.com",community,false,nil).deliver
      end
    rescue

    end
  end

  def send_email_to_user_without_humanize subj, body , community_email=nil
    begin
      emails = community_email.gsub(" ","").split(',')
      NotificationMailer.tour_history_mail(subj, body, self.tour_user.email, email[0],community,false,nil).deliver
    rescue

    end
  end

  def send_sms_tour_user message_body, community
    begin
      message_body = append_app_links_with_text_message(community, message_body)
      TwilioSmsWorker.perform_async(message_body, self&.tour_user&.phone_number, self&.tour_user&.email, community&.id) if self.tour_user.phone_number.present? && self.tour_user.is_sms_enabled
    rescue
    end
  end

  def send_email_tour_user subj, body, community_email, community
    begin
      emails = community_email.gsub(" ","").split(',')
      body = append_app_links_with_emailbody(community, body)

      NotificationMailer.tour_history_mail(subj, body, self.tour_user.email, emails[0],community,false,nil).deliver
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

  def fetch_property_name community_name
    SentenceFormatter.capitalized_words(community_name)
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

  def stop_marketing_names_visited_by_user
    sleep 2
    visited_stops = []

    current_tour = VisitedStop.where(tour_key:  self.tour_user.tour_key).order("id DESC").first
    tour_key = current_tour.tour_key if current_tour.present?

    if tour_key.present?
      tour_stop_ids = VisitedStop.where(tour_key:  tour_key).pluck(:tour_stop_id)
      unit_stops = TourStop.where(id: tour_stop_ids, stop_type: "unit").pluck(:stop_id)

      unit_stops.each do |stop_id|
        unit = Unit.find_by_id stop_id
        marketing_name = unit.marketing_name
        visited_stops << marketing_name if unit.present?
      end
    end

    return visited_stops
  end

  def append_app_links_with_emailbody community, email_body
    @community = community
    company_name = community.company.name.downcase

    @app_link = AppLinks.get_app_link(company_name)
    @android_link = AppLinks.get_android_link(company_name)

    "<div>#{email_body}<br>iPhone Users: <a href=#{@app_link} target='_blank'>Download Pynwheel Tour from the App Store</a><br>Android Users: <a href=#{@android_link} target='_blank'>Download Pynwheel Tour from Google Play</a><br></div>"
  end

  def append_app_links_with_text_message community, message_body
    @community = community
    company_name = community.company.name.downcase

    @app_link = AppLinks.get_app_link(company_name)
    @android_link = AppLinks.get_android_link(company_name)

    "#{message_body}\niPhone Users: #{@app_link}\nAndroid Users: #{@android_link}\n"
  end
end