namespace :delayed_email_notifications do
	include Rails.application.routes.url_helpers
	# default_url_options[:host] = 'http://localhost:3000'
	default_url_options[:host] = 'https://pynwheelconnect.com' 
	# default_url_options[:host] = 'https://pynwheelapp.com' if Rails.env.production?

	desc "This delayed email task is called every day by the Heroku scheduler add-on"

	task :one_day_before => :environment do
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Fetching Today Tours >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	  # schedual_tours = SchedualTour.where('tour_date = ? AND daily_email_sent = ?', Date.today+1, false)
	  schedual_tours = SchedualTour.where('tour_date > ? AND daily_email_sent = ? AND tour_date < ?',Date.today, false,Date.today + 2).where.not(tour_user_id: nil)
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Done: Fetching Today #{schedual_tours.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"

	  one_day_before_emails schedual_tours
	end

	desc "This delayed email task is called every 10 mins by the Heroku scheduler add-on"
	task :one_hour_before => :environment do
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Fetching Hour Left Tours >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	 	schedual_tours = SchedualTour.where('tour_date >= ? AND hourly_email_sent = ? AND tour_date < ?', Date.today - 1, false, Date.today + 1).where.not(tour_user_id: nil)
	 	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Done: Fetching Hour Left #{schedual_tours.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"
	 	one_hour_before_emails schedual_tours

	end
	desc "This delayed email task is called every 10 mins by the Heroku scheduler add-on"
	task :abandoned_tour_email => :environment do
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Fetching Hour Left Tours >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	  	
	 	tour_histories =  TourHistory.where('created_at > ? AND abandoned_tour_email_sent = ? AND active_app = ?', Date.today - 1, false, false).where.not(abandoned_tour_at_stop: nil)
	 	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Done: Fetching Hour Left #{tour_histories.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"
	 	abandoned_tour tour_histories

	end
	def abandoned_tour tour_histories
		tour_histories.each do |th|
			
			if th.present? and (Time.now - th.updated_at) > 60 
				community = (Tour.find_by_id th.tour_id).community 


		  		@mail_content = ["abandoned_tour_at_stop", "#{(TourUser.find th.tour_user_id).name rescue "User"} abandoned a tour of #{(community.name.titleize)} at "] #get_alert_message('abandoned_tour_at_stop')

				@mail_content[1] = "#{@mail_content.last} #{(TourStop.find th.abandoned_tour_at_stop.to_i).name.titleize rescue "Not Found"}."
				  
				@thank_you_content  = community.thank_you_message.present? ? community.thank_you_message : "Thank you for visiting #{community.name}! We hope you enjoyed your tour. Go back to the Pynwheel Self Tour app any time to review the details of your tour."
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
	  	else
			if mail_content[0] == "#{community.name} has been visited"
				send_email_without_humanize mail_content[0], mail_content[1], community
			else
				send_email mail_content[0], mail_content[1], community
			end
	  		# send_sms mail_content[1]
	  	end
	end

  	def send_email_sms_or_both_to_touruser thank_you_msg, community, th
  		
		if community.alert_contact == "email"
			send_email_tour_user "Thank you for visiting #{community.name}","<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.logo.present? ? community.logo.url : ''}' data-title='#{community.name}' /></div><br/> " + thank_you_msg, th, community.email
		elsif community.alert_contact == "phone"
			send_sms_tour_user thank_you_msg
		else
			send_email_tour_user "Thank you for visiting #{community.name}","<div style='vertical-align:middle; text-align:center'><img style='height: 100px;' src='#{community.logo.present? ? community.logo.url : ''}' data-title='#{community.name}' /></div><br/> " + thank_you_msg, th, community.email
			send_sms_tour_user thank_you_msg
		end
	end
	def send_email subj, body, community
		begin
			
			NotificationMailer.tour_history_mail(subj.humanize, body, community.email).deliver
		rescue

		end
  	end
  	def send_email_without_humanize subj, body, community
		begin
			NotificationMailer.tour_history_mail(subj.humanize, body, community.email).deliver
		rescue

		end
	end
  	def send_email_tour_user subj, body, th, comm_email
		begin
			NotificationMailer.tour_history_mail(subj.humanize, body, th.tour_user.email,comm_email).deliver
		rescue
		end
	end
	def send_sms_tour_user message_body
		begin
			DelayedSchedulerTextJob.perform_async(message_body, self.tour_user.phone_number) if self.tour_user.phone_number.present? 
		rescue
		end
	end

	def one_day_before_emails schedual_tours

	  	schedual_tours.each do |schedual_tour|
	  
			begin

		tu = schedual_tour.tour_user
	  	community = schedual_tour.community
		community_email = community.email.present? ? community.email : 'info@pynwheel.com'
	  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
			android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
			community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincolon Property Company Self Tour" : "Pynwheel Self Tour"
			# content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/> We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")} tomorrow for your self-guided tour. <br/>Download Pynwheel Self Tour:<br><a href=#{app_link} target='_blank'>Download Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a>. <br><br/><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"
			content = "<div style='vertical-align:middle; text-align:center'><img style='height: 55px;' src='#{community.logo.url}' data-title='#{community.name}' /></div><br/>Don't forget! You have an appointment for a Self Tour tomorrow at <b>#{community.name if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive. <br>iPhone Users: <a href=#{app_link} target='_blank'>Download #{community_text} from the App Store</a>. <br>Android Users: <a href=#{app_link} target='_blank'>Download #{community_text} from Google Play</a><br><a href='#{change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text.gsub("\n", "<br>").html_safe rescue ""}"
			sms_content = "Don't forget! You have an appointment for a Self Tour tomorrow at #{community.name if community.present?} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive.
iPhone Users: Download #{community_text} from the App Store. #{app_link}
Android Users: Download #{community_text} from Google Play. #{android_link}
Change appointment #{change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}
#{community.one_day_email_text}"

			# "Don't forget! You have an appointment for a Self Tour tomorrow at <b>#{community.name.humanize if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Make sure you have downloaded the Pynwheel Self Tour (or Lincolon Property Company Self Tour) app before you arrive. <br>iPhone Users: <a href=#{app_link} target='_blank'>Download #{community_text} from the App Store</a>. <br>Android Users: <a href=#{app_link} target='_blank'>Download #{community_text} from Google Play</a><br><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"
			# day_diff = (schedual_tour.day_diff-1)
			# day_diff = 0 if day_diff < 0
			# schedual_tour.update_columns(daily_email_sent: true, day_diff: day_diff)
			diff = (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(schedual_tour.user_time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y"))) 
			schedual_tour.update_columns(daily_email_sent: true) if diff == 1
			
			DelayedSchedulerMailerJob.perform_async("Your Tour Tomorrow", content, tu.email,nil,nil,nil,community_email) if (diff == 1 && !(community.alert_contact == "phone"))
			DelayedSchedulerTextJob.perform_async(sms_content, tu.phone_number) if (diff == 1 && !(community.alert_contact == "email"))
	  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
		end
	rescue => ex
		puts "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"
				puts ex.message
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
				puts "<<<<<<<<<<<<<<<<<<<<<<<<< TIME LEFT TO EMAIL #{time_left_to_email} >>>>>>>>>>>>>>>>>>>>>>"
				if time_left_to_email <= 60 && time_left_to_email > 0
					tu = schedual_tour.tour_user
			  	community = schedual_tour.community
					community_email = community.email.present? ? community.email : 'info@pynwheel.com'
			  	
			  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
					app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
					community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincolon Property Company Self Tour" : "Pynwheel Self Tour"
					android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
					# content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/>We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}.<br/><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br/>When you arrive at the property, open: <br><a href=#{app_link} target='_blank'>Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a> to start your tour. <br>#{community.one_hour_email_text}"
					content = "<div style='vertical-align:middle; text-align:center'><img style='height: 55px;' src='#{community.logo.url}' data-title='#{community.name}' /></div><br/>Your tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br>Open <a href=#{app_link} target='_blank'>#{community_text}</a>for iPhones.<br>Open <a href=#{android_link} target='_blank'>#{community_text}</a> for Android <br>#{community.one_hour_email_text.gsub("\n", "<br>").html_safe rescue ""}"
					sms_content = "Your tour starts soon!
Here are directions to #{community.name}  https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}
When you arrive at the property, open the #{community_text} app to begin your tour.
Open #{community_text} for iPhones #{app_link}
Open #{community_text} for Android #{android_link}
#{community.one_hour_email_text}"
					# "Your self-guided tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br>Open #{community_text} for iPhones <a href=#{app_link} target='_blank'>link</a><br>Open #{community_text} for Android <a href=#{app_link} target='_blank'>link</a> <br>#{community.one_hour_email_text}"
					schedual_tour.update_columns(hourly_email_sent: true)

					DelayedSchedulerMailerJob.perform_async("Your tour starts soon!", content, tu.email,nil,nil,nil,community_email) if !(community.alert_contact == "phone")
					DelayedSchedulerTextJob.perform_async(sms_content, tu.phone_number) if !(community.alert_contact == "email")
			  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			  end
			end
			rescue => ex
				puts "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"
				puts ex.message
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
				RealPageGuestCardIntegrationJob.perform_async(community.credential.attributes.to_json, th.tour_user, tour_time, end_time, tour_status, available_stops, visited_stops)
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
		puts "visited_stops"
		puts visited_stops
		return visited_stops
	end

end