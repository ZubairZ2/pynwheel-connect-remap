namespace :delayed_email_notifications do
	include Rails.application.routes.url_helpers
	# default_url_options[:host] = 'http://localhost:3000'
	default_url_options[:host] = 'https://pynwheelconnect.com' 
	# default_url_options[:host] = 'https://pynwheelapp.com' if Rails.env.production?

	desc "This delayed email task is called every day by the Heroku scheduler add-on"

	task :one_day_before => :environment do
	  # schedual_tours = SchedualTour.where('tour_date = ? AND daily_email_sent = ?', Date.today+1, false)
	  schedual_tours = SchedualTour.where('tour_date > ? AND daily_email_sent = ? AND tour_date < ?',Date.today, false,Date.today + 2).where.not(tour_user_id: nil)

	  one_day_before_emails schedual_tours
	end

	desc "This delayed email task is called every 10 mins by the Heroku scheduler add-on"
	task :one_hour_before => :environment do
	 	schedual_tours = SchedualTour.where('tour_date >= ? AND hourly_email_sent = ? AND tour_date < ?', Date.today - 1, false, Date.today + 1).where.not(tour_user_id: nil)
	 	one_hour_before_emails schedual_tours

	end
	desc "This delayed email task is called every 10 mins by the Heroku scheduler add-on"
	task :abandoned_tour_email => :environment do
	  	
	 	tour_histories =  TourHistory.where('created_at > ? AND abandoned_tour_email_sent = ? AND active_app = ?', Date.today - 1, false, false).where.not(abandoned_tour_at_stop: nil)
	 	abandoned_tour tour_histories

	end
	def abandoned_tour tour_histories
		tour_histories.each do |th|
			
			if th.present? and (Time.now - th.updated_at) > 60 
				community = (Tour.find_by_id th.tour_id).community 


		  		@mail_content = ["abandoned_tour_at_stop", "#{(TourUser.find th.tour_user_id).name rescue "User"} abandoned a tour of #{(community.name.titleize)} at "] #get_alert_message('abandoned_tour_at_stop')

				@mail_content[1] = "#{@mail_content.last} #{(TourStop.find th.abandoned_tour_at_stop.to_i).name.titleize rescue "Not Found"}."
				if th.tour_user_id == 1445
          @thank_you_content  = community.thank_you_message.present? ? community.thank_you_message : "111Thank you for visiting #{community.name}! We hope you enjoyed your tour. Go back to the Pynwheel Self Tour app any time to review the details of your tour."
				else
				  @thank_you_content  = community.thank_you_message.present? ? community.thank_you_message : "Thank you for visiting #{community.name}! We hope you enjoyed your tour. Go back to the Pynwheel Self Tour app any time to review the details of your tour."
        end
				touruser_remotelock_data community, th

				# tour = (Tour.find_by_id self.tour_id)
				# assigned_pin = self.tour_user.as_guests.find_by(community_id: tour.community.id).edgestate_pin if tour.present? and self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
				# ImportRemotelockEventsJob.perform_in(2.5.minute.seconds.to_i, self.tour_user, self, assigned_pin) if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
				# ImportRemotelockEventsWorker.perform_at(30.minutes.from_now, self.tour_user.id.to_s, self.id.to_s, assigned_pin)

				# email_content = "Events for #{self.tour_user.name} with tour id #{self.tour_user.id} are imported in pynwheel, while the tour history id is #{self.id} and the assigned pin is #{assigned_pin}" if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?
				# DelayedSchedulerMailerJob.perform_async("Remote Lock Events", email_content, "humza4142@gmail.com","Lock History has been imported","check the database, its ran in callback","humza4142@gmail.com") if self.tour_user.present? and self.tour_user.as_guests.find_by(community_id: tour.community.id).present?

				send_email_sms_or_both @mail_content, community
				send_email_sms_or_both_to_touruser @thank_you_content, community, th
				th.update_column 'abandoned_tour_email_sent', true
				# community.deleted_ids = []
				save_prospect(th.lengthy_stay, th, community) if th.lengthy_stay.present?
				th.abandoned_tour_email_sent = true
				th.save

				community.save
			end
		end
		
	end
	def send_email_sms_or_both mail_content, community
		
	  	if community.alert_contact == "email"
			if mail_content[0] == "#{community.name} has been visited"
				send_email_without_humanize mail_content[0], mail_content[1], community
			else
				send_email mail_content[0], mail_content[1], community
			end
	  	elsif community.alert_contact == "phone"
	  		send_sms mail_content[1]
				if mail_content[0] == "#{community.name} has been visited"
					send_email_without_humanize mail_content[0], mail_content[1], community
				else
					send_email mail_content[0], mail_content[1], community
				end
	  	else
	  		send_sms mail_content[1]
				if mail_content[0] == "#{community.name} has been visited"
					send_email_without_humanize mail_content[0], mail_content[1], community
				else
					send_email mail_content[0], mail_content[1], community
				end
	  	end
	end
	def send_sms message_body
	    # begin
	    #   DelayedSchedulerTextJob.perform_async(message_body, community.phone) if community.phone.present?
	    # rescue
	    # end
 	end
  	def send_email_sms_or_both_to_touruser thank_you_msg, community, th

		if community.alert_contact == "email"
			send_email_to_user_without_humanize "Thank you for visiting #{community.name.split.map(&:capitalize).join(' ')}", "<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.self_tour_logo.present? ? community.self_tour_logo.url : ''}' data-title='#{community.name}' /></div><br/> " + thank_you_msg, th, community.email,community
		elsif community.alert_contact == "phone"
			send_sms_tour_user thank_you_msg, th
		else
			send_email_to_user_without_humanize "Thank you for visiting #{community.name.split.map(&:capitalize).join(' ')}","<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.self_tour_logo.present? ? community.self_tour_logo.url : ''}' data-title='#{community.name}' /></div><br/> " + thank_you_msg, th, community.email,community
			send_sms_tour_user thank_you_msg ,th
		end
		end
	def send_email_to_user_without_humanize subj, body, th=nil, comm_email=nil,community
		begin
			emails = comm_email.gsub(" ","").split(',')
			NotificationMailer.tour_history_mail(subj, body, th.tour_user.email,emails[0],community,false).deliver
		rescue

		end
	end
	def send_email subj, body, community
		begin
			emails = community.email.gsub(" ","").split(',')
			NotificationMailer.tour_history_mail(subj.humanize, body, emails[0],community,false).deliver
		rescue

		end
  	end
  	def send_email_without_humanize subj, body, community
		begin
			emails = community.email.gsub(" ","").split(',')
			emails.each do |email|
				NotificationMailer.tour_history_mail(subj.humanize, body, email,"info@pynwheel.com",community,false).deliver
			end
		rescue

		end
	end
  	def send_email_tour_user subj, body, th, comm_email, community
		begin
			emails = comm_email.gsub(" ","").split(',')
			NotificationMailer.tour_history_mail(subj.humanize, body, th.tour_user.email,emails[0]).deliver
		rescue
		end
	end
	def send_sms_tour_user message_body,th
		begin
			DelayedSchedulerTextJob.perform_async(message_body, th.tour_user.phone_number) if th.tour_user.phone_number.present? && th.tour_user.is_sms_enabled
		rescue
		end
	end

	def one_day_before_emails schedual_tours

		schedual_tours.each do |schedual_tour|
	
		  begin

	  tu = schedual_tour.tour_user
	  community = schedual_tour.community
	  community_code = (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256') if community.present?
	  community_email = community.email.present? ? community.email : 'info@pynwheel.com'
		# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
		  app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
		  one_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
		  android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
		  community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincoln Property Company Self Tour" : "Pynwheel Self Tour"
		  # content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/> We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")} tomorrow for your self-guided tour. <br/>Download Pynwheel Self Tour:<br><a href=#{app_link} target='_blank'>Download Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a>. <br><br/><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"
		  change_appointment = (show_contact community) ? ((community.phone.present? || community.email.present?) ? ("If you want to re-schedule or cancel your visit contact property at #{community.phone.present? ? community.phone : ""} #{(community.phone.present? and community.email.present?)  ? "or" : ""} email #{community.email.present? ? community.email : ""}.") : "") : "<a href='#{reschedule_tour(schedual_tour, community, community_code, tu.id)}'>Change appointment</a>"
		  is_rescheduled = false
		  confirmation_page_link = "#{root_url}scheduler_widget/confirmation_instructions?community_id=#{community.id}&schedual_tour=#{schedual_tour.id}&reschedule=#{is_rescheduled}"
		  if community.tour.tour_setting.enable_header_footer
			  content = "Don't forget! You have an appointment for a Self Tour tomorrow at <b>#{community.name if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive.<br>#{change_appointment}<br>#{community.one_day_email_text.gsub("\n", "<br>").html_safe rescue ""}"
		  else
			  content = "<div style='vertical-align:middle; text-align:center'><img style='height: 55px;' src='#{community.logo.url}' data-title='#{community.name}' /></div><br/>Don't forget! You have an appointment for a Self Tour tomorrow at <b>#{community.name if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive. <br> iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Self Tour from the App Store</a><br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play</a><br>#{community.one_day_email_text.gsub("\n", "<br>").html_safe rescue ""}"
		  end
		  sms_content = "Don't forget! You have an appointment for a Self Tour tomorrow at #{community.name if community.present?} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive.
		  Download The #{community_text} #{one_link}
		  Change appointment #{reschedule_tour(schedual_tour, community, community_code, tu.id)}
		  Get information about your tour here: #{confirmation_page_link}
		  #{community.one_day_email_text}"
		  # Change appointment #{change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}
		  # iPhone Users: Download #{community_text} from the App Store. #{app_link}
		  # Android Users: Download #{community_text} from Google Play. #{android_link}

		  # "Don't forget! You have an appointment for a Self Tour tomorrow at <b>#{community.name.humanize if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Make sure you have downloaded the Pynwheel Self Tour (or Lincoln Property Company Self Tour) app before you arrive. <br>iPhone Users: <a href=#{app_link} target='_blank'>Download #{community_text} from the App Store</a>. <br>Android Users: <a href=#{app_link} target='_blank'>Download #{community_text} from Google Play</a><br><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"
		  # day_diff = (schedual_tour.day_diff-1)
		  # day_diff = 0 if day_diff < 0
		  # schedual_tour.update_columns(daily_email_sent: true, day_diff: day_diff)
		  diff = (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(schedual_tour.user_time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y"))) 
		  schedual_tour.update_columns(daily_email_sent: true) if diff == 1
		  emails = community_email.gsub(" ","").split(',')
		  DelayedSchedulerMailerJob.perform_async("Your Tour Tomorrow", content, tu.email,community,nil,nil,nil,emails[0],true,schedual_tour) if (schedual_tour.property_tour_type == "scheduled_tour" && (diff == 1 && !(community.alert_contact == "phone")))
		  DelayedSchedulerTextJob.perform_async(sms_content, tu.phone_number) if (schedual_tour.property_tour_type == "scheduled_tour" && schedual_tour.tour_user.is_sms_enabled && (diff == 1 && !(community.alert_contact == "email")))

		# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	  end
  rescue => ex
  end

  end

  def one_hour_before_emails schedual_tours

	  schedual_tours.each do |schedual_tour|
		  
		  begin

		  if (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(schedual_tour.user_time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y"))) == 0

			  tour_time = Time.parse(schedual_tour.tour_time.strftime("%k:%M"))
			  server_time = Time.parse(Time.current.in_time_zone(schedual_tour.user_time_zone).strftime("%k:%M"))

			  time_left_to_email = (tour_time - server_time)/1.minute
			  
			  time_left_to_email = time_left_to_email * -1 if time_left_to_email < 0
			  if time_left_to_email <= 60 && time_left_to_email > 0
				  tu = schedual_tour.tour_user
				community = schedual_tour.community
				  community_email = community.email.present? ? community.email : 'info@pynwheel.com'
				
				# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
				  app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
				  community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincoln Property Company Self Tour" : "Pynwheel Self Tour"
				  android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
				  one_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
				  # content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/>We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}.<br/><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br/>When you arrive at the property, open: <br><a href=#{app_link} target='_blank'>Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a> to start your tour. <br>#{community.one_hour_email_text}"
				  is_rescheduled = false
				  confirmation_page_link = "#{root_url}scheduler_widget/confirmation_instructions?community_id=#{community.id}&schedual_tour=#{schedual_tour.id}&reschedule=#{is_rescheduled}"
				  if community.tour.tour_setting.enable_header_footer
					  content = "<div style='vertical-align:middle; text-align:center'><p style='font-weight: normal; font-size: 18px; font-family: Poppins;'> Your tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br> Please download Self Tour app before you arrive:<br>#{community.one_hour_email_text.gsub("\n", "<br>").html_safe rescue ""} </p></div>"
				  else
					  content = "<div style='vertical-align:middle; text-align:center'><img style='height: 55px;' src='#{community.logo.url}' data-title='#{community.name}' /></div><br/>Your tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br>iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Self Tour from the App Store</a> <br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play</a><br>#{community.one_hour_email_text.gsub("\n", "<br>").html_safe rescue ""}"
				  end
				  sms_content = "Your tour starts soon!
				  Here are directions to #{community.name}  https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}
				  When you arrive at the property, open the #{community_text} app to begin your tour.
				  Open #{community_text} #{one_link}
				  Get information about your tour here: #{confirmation_page_link}
				  #{community.one_hour_email_text}"
				  # "Your self-guided tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br>Open #{community_text} for iPhones <a href=#{app_link} target='_blank'>link</a><br>Open #{community_text} for Android <a href=#{app_link} target='_blank'>link</a> <br>#{community.one_hour_email_text}"
				  # Open #{community_text} for iPhones #{app_link}
				  # Open #{community_text} for Android #{android_link}
				  schedual_tour.update_columns(hourly_email_sent: true)
				  emails = community_email.gsub(" ","").split(',')
				  DelayedSchedulerMailerJob.perform_async("Your tour starts soon!", content, tu.email,community,nil,nil,nil,emails[0],true,schedual_tour) if !(community.alert_contact == "phone")
				  DelayedSchedulerTextJob.perform_async(sms_content, tu.phone_number) if (schedual_tour.tour_user.is_sms_enabled && !(community.alert_contact == "email"))

				# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			end
		  end
		  rescue => ex
		  end

	  end
  end

	def get_date_time_combined date, time
	  DateTime.new(date.year, date.month, date.day, time.hour, time.min, time.sec, time.zone)
	end

	def save_prospect(endtime, th,community)
		begin
			end_time = endtime.in_time_zone(th.my_time_zone)
			tour_time = th.arrived.in_time_zone(th.my_time_zone)
			tour_status = th.tour_status.present? ? th.tour_status : "virutal"

			available_stops = avail_stops_name_of_community community
			visited_stops = stop_marketing_names_visited_by_user th
			
			if community.data_provider == "realpagesvc"
				RealPageGuestCardIntegrationJob.perform_async(community.credential.attributes.to_json, th.tour_user, tour_time, end_time, tour_status, available_stops, visited_stops, community)
			elsif community.data_provider == "psi"
				community.entrata_send_mits_leads(th.tour_user, tour_time, end_time, visited_stops)
			end
		rescue
		end
	end
	
	def touruser_remotelock_data community, th
		
		community = (Tour.find_by_id th.tour_id).community
		as_guests_data = th.tour_user.as_guests.find_by(community_id: community.id)

		if as_guests_data.present?
			Thread.new do
				access_token = RemoteLockService.new(community).client_credentials

				page = 1
				while page <= 1 do
					responce = RemoteLockService.new(community).get_all_events(access_token,page)
					responce["data"].each do |event|
						if active_user_exists(event,as_guests_data.guest_id)

							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							th.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
						
						elsif expire_user_exists(event, tour_user.name, as_guests_data.edgestate_pin)
							
							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							th.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
				
						elsif sync_events_exists(event,as_guests_data.guest_id) # just for testing
							
							occurred_at = event["attributes"]["occurred_at"].to_datetime.in_time_zone(event["attributes"]["time_zone"]).strftime('%a, %d %b %Y %H:%M:%S').to_datetime
							rml = RemoteLock.find_by(device_id: event["attributes"]["publisher_id"])
							th.lock_histories.create(event: event["type"], occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: self.tour_user_id) if rml.present?
						
						end
					
					end
					page = page + 1
				end
			end
		end
	end

	def avail_stops_name_of_community community
		# stops_arr = community.mdu ? community.tour.tour_stops.where(display_stop: true).order(:sort) :  community.tour.tour_stops.where(display_stop: true,stop_type: "amenity").order(:sort)
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
	def show_contact community
		if community.credential.use_different_crm_provider && (community.crm_credential.crm_provider == "salesforce" || community.crm_credential.crm_provider == "yardirentcafe")
			return true
		else
			return false
		end
	end


	def stop_marketing_names_visited_by_user th
		visited_stops = []

		current_tour = VisitedStop.where(tour_user_id: th.tour_user_id, tour_id: th.tour_id).last
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
		return visited_stops
	end

end