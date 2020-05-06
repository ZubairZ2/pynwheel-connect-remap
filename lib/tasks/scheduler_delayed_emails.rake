namespace :delayed_email_notifications do
	include Rails.application.routes.url_helpers
	# default_url_options[:host] = 'http://localhost:3000'
	default_url_options[:host] = 'https://pynwheel-staging.herokuapp.com' if Rails.env.development?
	default_url_options[:host] = 'https://pynwheelapp.com' if Rails.env.production?

	desc "This delayed email task is called every day by the Heroku scheduler add-on"

	task :one_day_before => :environment do
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Fetching Today Tours >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	  # schedual_tours = SchedualTour.where('tour_date = ? AND daily_email_sent = ?', Date.today+1, false)
	  schedual_tours = SchedualTour.where('tour_date > ? AND daily_email_sent = ?',Date.today, false)
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Done: Fetching Today #{schedual_tours.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"

	  one_day_before_emails schedual_tours
	end

	desc "This delayed email task is called every 10 mins by the Heroku scheduler add-on"
	task :one_hour_before => :environment do
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Fetching Hour Left Tours >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	 	schedual_tours = SchedualTour.where('tour_date >= ? AND hourly_email_sent = ? AND tour_date < ?', Date.today - 1, false, Date.today + 1)
	 	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Done: Fetching Hour Left #{schedual_tours.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"
	 	one_hour_before_emails schedual_tours

	end

	def one_day_before_emails schedual_tours

	  	schedual_tours.each do |schedual_tour|
	  
			
		tu = schedual_tour.tour_user
	  	community = schedual_tour.community
	  	
	  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
			android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
			content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/> We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")} tomorrow for your self-guided tour. <br/>Download Pynwheel Self Tour:<br><a href=#{app_link} target='_blank'>Download Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a>. <br><br/><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"


			# day_diff = (schedual_tour.day_diff-1)
			# day_diff = 0 if day_diff < 0
			# schedual_tour.update_columns(daily_email_sent: true, day_diff: day_diff)
			diff = (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(schedual_tour.user_time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y"))) 
			schedual_tour.update_columns(daily_email_sent: true) if diff == 1
			DelayedSchedulerMailerJob.perform_async("Your Tomorrow Tour", content, tu.email) if diff == 1
	  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
		end

	end

	def one_hour_before_emails schedual_tours

		schedual_tours.each do |schedual_tour|
			
			if (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(schedual_tour.user_time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y"))) == 0

				tour_time = Time.parse(schedual_tour.tour_time.strftime("%k:%M"))
				server_time = Time.parse(Time.current.in_time_zone(schedual_tour.user_time_zone).strftime("%k:%M"))

				time_left_to_email = (tour_time - server_time)/1.minute
				
				time_left_to_email * -1 if time_left_to_email < 0
				puts "<<<<<<<<<<<<<<<<<<<<<<<<< TIME LEFT TO EMAIL #{time_left_to_email} >>>>>>>>>>>>>>>>>>>>>>"
				
				if time_left_to_email <= 60
					tu = schedual_tour.tour_user
			  	community = schedual_tour.community
			  	
			  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
					app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
					android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
					content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/>We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}.<br/><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br/>When you arrive at the property, open: <br><a href=#{app_link} target='_blank'>Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a> to start your tour. <br>#{community.one_hour_email_text}"

					schedual_tour.update_columns(hourly_email_sent: true)
					DelayedSchedulerMailerJob.perform_async("Your self-guided tour starts soon!", content, tu.email)
			  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			  end
			end

		end
	end

	def get_date_time_combined date, time
	  DateTime.new(date.year, date.month, date.day, time.hour, time.min, time.sec, time.zone)
	end

end