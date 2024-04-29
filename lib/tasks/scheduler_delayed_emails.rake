namespace :delayed_email_notifications do
	include Rails.application.routes.url_helpers
	default_url_options[:host] = 'https://pynwheelconnect.com' 

	desc "This delayed email task is called every day by the Heroku scheduler add-on"
	task :one_day_before => :environment do
	  schedule_tours = SchedualTour.scheduled_tours
	  coming_from = "on_day_before"
	  get_follow_up_tours(schedule_tours,coming_from)
	end

	desc "This delayed email task is called every 10 mins by the Heroku scheduler add-on"
	task :one_hour_before => :environment do
		schedule_tours = SchedualTour.scheduled_tours
		coming_from = "on_hour_before"
		get_follow_up_tours(schedule_tours, coming_from)
	end

	desc "This delayed email task is called every 10 mins by the Heroku scheduler add-on"
	task :abandoned_tour_email => :environment do
	  	
	 	tour_histories =  TourHistory.where('created_at > ? AND abandoned_tour_email_sent = ? AND active_app = ?', Date.today - 1, false, false).where.not(abandoned_tour_at_stop: nil)
	 	abandoned_tour tour_histories

	end

	def get_follow_up_tours(schedule_tours,coming_from)
		schedule_tours.each do |schedule_tour|
			community = schedule_tour.community
			timezone = community.get_time_zone()
			current_day = Time.now.in_time_zone(timezone).to_date
			tour_date = schedule_tour&.tour_date if schedule_tour.tour_date.present?
			daily_email_sent = schedule_tour.daily_email_sent
			hourly_email_sent = schedule_tour.hourly_email_sent
			one_hour_before_emails schedule_tour if !schedule_tour.hourly_email_sent
			one_day_before_emails schedule_tour if coming_from == "on_day_before" and tour_date > current_day and !daily_email_sent and tour_date < (current_day + 2)
		end
	end

	def time_difference tour_time, current_time
    ((tour_time - current_time) / 1.minute).round
  end

	def abandoned_tour tour_histories
		tour_histories.each do |th|
			if th.present?
				tour = (Tour.find_by_id th.tour_id)
        tour_user = TourUser.find_by_id th.tour_user_id
				community = tour&.community

  				if community.present? and (Time.now - th.updated_at) > 60 

  					@mail_content = ["abandoned_tour_at_stop", "#{tour_user.name rescue "User"} abandoned a tour of #{(community.name.titleize)} at "]

  					@mail_content[1] = "#{@mail_content.last} #{(TourStop.find th.abandoned_tour_at_stop.to_i).name.titleize rescue "Not Found"}."
  					
  					if th.tour_user_id == 1445
  						@thank_you_content  = community.thank_you_message.present? ? community.thank_you_message : "111Thank you for visiting #{fetch_property_name(community.name)}! We hope you enjoyed your tour. Go back to the Pynwheel Tour app any time to review the details of your tour."
  					else
  						@thank_you_content  = community.thank_you_message.present? ? community.thank_you_message : "Thank you for visiting #{fetch_property_name(community.name)}! We hope you enjoyed your tour. Go back to the Pynwheel Tour app any time to review the details of your tour."
  					end

						# @thank_you_content = append_app_links_with_emailbody(community, @thank_you_content)

  					touruser_remotelock_data community, th
  					send_email_sms_or_both(@mail_content, community) unless tour_user&.is_virtual_tour?

  					send_email_sms_or_both_to_touruser @thank_you_content, community, th
  					th.update_column 'abandoned_tour_email_sent', true
  					save_prospect(th.lengthy_stay, th, community) if th.lengthy_stay.present?
  					th.abandoned_tour_email_sent = true
  					th.save

  					community.save
  				end
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
				if mail_content[0] == "#{community.name} has been visited"
					send_email_without_humanize mail_content[0], mail_content[1], community
				else
					send_email mail_content[0], mail_content[1], community
				end

	  	else
				if mail_content[0] == "#{community.name} has been visited"
					send_email_without_humanize mail_content[0], mail_content[1], community
				else
					send_email mail_content[0], mail_content[1], community
				end
	  	end
	end

  def send_email_sms_or_both_to_touruser thank_you_msg, community, th

		if community.alert_contact == "email"
			send_email_to_user_without_humanize "Thank you for visiting #{fetch_property_name(community.name)}", "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /></div><br/> " + thank_you_msg, th, community.email,community
		elsif community.alert_contact == "phone"
			send_sms_tour_user( thank_you_msg, th, community)
		else
			send_email_to_user_without_humanize "Thank you for visiting #{fetch_property_name(community.name)}","<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /></div><br/> " + thank_you_msg, th, community.email,community
			send_sms_tour_user(thank_you_msg, th, community)
		end
	end

	def send_email_to_user_without_humanize subj, body, th=nil, comm_email=nil,community
		begin
			emails = comm_email.gsub(" ","").split(',')
			body = append_app_links_with_emailbody(community, body)
			NotificationMailer.tour_history_mail(subj, body, th.tour_user.email,emails[0],community,false,nil).deliver
		rescue

		end
	end

	def send_email subj, body, community
		begin
			emails = community.email.gsub(" ","").split(',')
			NotificationMailer.tour_history_mail(subj, body, emails[0],"info@pynwheel.com",community,false,nil).deliver
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

  def send_email_tour_user subj, body, th, comm_email, community
		begin
			emails = comm_email.gsub(" ","").split(',')
			NotificationMailer.tour_history_mail(subj, body, th.tour_user.email,emails[0],community,false,nil).deliver 
		rescue
		end
	end

	def send_sms_tour_user message_body, th, community
		begin
			message_body = append_app_links_with_text_message(community, message_body)
			TwilioSmsWorker.perform_async(message_body, th&.tour_user&.phone_number, th&.tour_user&.email, community&.id) if th.tour_user.phone_number.present? && th.tour_user.is_sms_enabled && community.crm_credential.crm_provider != "salesforce"
		rescue
		end
	end

	def fetch_property_name community_name
    SentenceFormatter.capitalized_words(community_name)
  end  


	def one_day_before_emails schedual_tour
	  return if schedual_tour.blank?
		time_zone = schedual_tour.community.get_time_zone() rescue "UTC"
	  tu = schedual_tour.tour_user
	  community = schedual_tour.community
	  community_code = (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256') if community.present?
	  community_email = community.email.present? ? community.email : 'info@pynwheel.com'
		  app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
		  one_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
		  android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
		  community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincoln Property Company Pynwheel Tour" : "Pynwheel Tour"
		  base_url =  Rails.env.development? ? "localhost:3000/" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com/" : "https://pynwheelconnect.com/") 
		  reschedule_tour_link = "#{base_url}scheduler_widget/test_widget?scheduled_tour_id=#{schedual_tour.id}&community_id=#{community.id}&tour_user_id=#{tu.id}&reschedule_tour=true&direct=true&community_code=#{community_code}"
		  change_appointment_button = "<a href='#{reschedule_tour_link}' target='_blank' style='margin-top: 25px;margin-bottom: 10px;color: #FFFFFF; font-size: 16px; line-height:22.37px;font-weight: 700;-webkit-text-size-adjust: none;text-align: center; text-decoration: none;display: inline-block;overflow-wrap: break-word;word-break: break-word; word-wrap:break-word; mso-border-alt: none; box-sizing: border-box;font-family:arial,helvetica,sans-serif;background-color: #3f9d6d; '>	<span style='display:block;padding:10px 20px;line-height:140%;'><span style='font-family:arial,helvetica,sans-serif; font-size: 20px; line-height:30px;'><b><span style='line-height: 30px; font-size: 20px;'>Change Appointment</span></b></span></span></a>"
			change_appointment = (show_contact community) ? ((community.phone.present? || community.email.present?) ? ("If you want to re-schedule or cancel your visit contact property at #{community.phone.present? ? community.phone : ""} #{(community.phone.present? and community.email.present?)  ? "or" : ""} email #{community.email.present? ? community.email : ""}.") : "") : change_appointment_button
		  is_rescheduled = false
			
			change_appointment = (schedual_tour.created_by === "PERQ" ?  "" : change_appointment)
			mobile_change_appointment = (schedual_tour.created_by === "PERQ" ?  "" : "Change appointment: #{reschedule_tour_link}#{"\n"}")
		  
			confirmation_page_link = "#{base_url}scheduler_widget/confirmation_instructions?community_id=#{community.id}&schedual_tour=#{schedual_tour.id}&reschedule=#{is_rescheduled}"
		  if community.community_tour.tour_setting.enable_header_footer
			  content = "Don't forget! You have an appointment for a Pynwheel Tour tomorrow at <b>#{community.name if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive.<br>#{change_appointment}<br>#{community.one_day_email_text.gsub("\n", "<br>").html_safe rescue ""}"
		  else
			  content = "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /></div><br/>Don't forget! You have an appointment for a Pynwheel Tour tomorrow at <b>#{community.name if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive. <br> iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Tour from the App Store</a><br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Tour from Google Play</a><br>#{community.one_day_email_text.gsub("\n", "<br>").html_safe rescue ""}"
		  end
		  sms_content = "Don't forget! You have an appointment for a Pynwheel Tour tomorrow at #{community.name if community.present?} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive.
Download The #{community_text} #{one_link}#{"\n"}
#{mobile_change_appointment}
Get information about your tour here: #{confirmation_page_link}#{"\n"}
#{community.one_day_email_text}"
		  diff = (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y")))
		  schedual_tour.update_columns(daily_email_sent: true) if diff == 1
		  emails = community_email.gsub(" ","").split(',')

			ScheduledTourMailerJob.perform_async("Your Tour Tomorrow", content, tu.email,community,nil,nil,nil,emails[0],true,schedual_tour) if (schedual_tour.property_tour_type == "scheduled_tour" && (diff == 1 && !(community.alert_contact == "phone")) && !(community.credential.use_different_crm_provider && community.crm_credential.crm_provider == "salesforce"))
		  TwilioSmsWorker.perform_async(sms_content, tu&.phone_number, tu&.email, community&.id) if (schedual_tour.property_tour_type == "scheduled_tour" && schedual_tour.tour_user.is_sms_enabled && (diff == 1 && !(community.alert_contact == "email")) && !(community.credential.use_different_crm_provider && community.crm_credential.crm_provider == "salesforce"))

  end

	def one_hour_before_emails schedual_tour
		return if schedual_tour.blank?
		time_zone = schedual_tour.community.get_time_zone() rescue "UTC"

		if (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y"))) == 0
			tour_time = Time.parse(schedual_tour.tour_time.strftime("%k:%M"))
			server_time = Time.parse(Time.current.in_time_zone(time_zone).strftime("%k:%M"))

			time_left_to_email = (tour_time - server_time)/1.minute
			
			if time_left_to_email <= 60 && time_left_to_email > 0
				tu = schedual_tour.tour_user
				community = schedual_tour.community
				community_email = community.email.present? ? community.email : 'info@pynwheel.com'
				app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
				community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincoln Property Company Pynwheel Tour" : "Pynwheel Tour"
				android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
				one_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
				base_url =  Rails.env.development? ? "localhost:3000/" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com/" : "https://pynwheelconnect.com/") 
				is_rescheduled = false
				confirmation_page_link = "#{base_url}scheduler_widget/confirmation_instructions?community_id=#{community.id}&schedual_tour=#{schedual_tour.id}&reschedule=#{is_rescheduled}"
				if community.community_tour.tour_setting.enable_header_footer
					content = "<div style='vertical-align:middle; text-align:center'><p style='font-weight: normal;line-height: 30px;font-size: 16px; font-family: arial,helvetica,sans-serif;'> Your tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.get_propery_address()}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br> <b> Please download Pynwheel Tour app before you arrive:</b> <br>#{community.one_hour_email_text.gsub("\n", "<br>").html_safe rescue ""} </p></div>"
				else
					content = "<div style='vertical-align:middle; font-family: arial,helvetica,sans-serif; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /></div><br/>Your tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.get_propery_address()}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br>iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Tour from the App Store</a> <br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Tour from Google Play</a><br>#{community.one_hour_email_text.gsub("\n", "<br>").html_safe rescue ""}"
				end
				sms_content = "Your tour starts soon!
				#{"\n"}Here are directions to #{community.name}:#{"\n"}https://www.google.com/maps/search/?api=1&query=#{community.get_propery_address()} #{"\n"}#{"\n"}When you arrive at the property, open the #{community_text} app to begin your tour. #{"\n"} #{"\n"}Open #{community_text}:#{"\n"}#{one_link}#{"\n"} #{"\n"}Get more information about your tour here: #{"\n"}#{confirmation_page_link}
				#{community.one_hour_email_text}"
				schedual_tour.update_columns(hourly_email_sent: true)
				emails = community_email.gsub(" ","").split(',')
				
				ScheduledTourMailerJob.perform_async("Your tour starts soon!", content, tu.email,community,nil,nil,nil,emails[0],true,schedual_tour) if !(community.alert_contact == "phone") && !(community.credential.use_different_crm_provider && community.crm_credential.crm_provider == "salesforce")
				TwilioSmsWorker.perform_async(sms_content, tu&.phone_number, tu&.email, community&.id) if (schedual_tour.tour_user.is_sms_enabled && !(community.alert_contact == "email") && !(community.credential.use_different_crm_provider && community.crm_credential.crm_provider == "salesforce"))
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
		return []
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

	def logo_style
    "outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; clear: both; display: inline-block !important; border: none; height: auto; float: none; width: 200px; max-width: 200px;"
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