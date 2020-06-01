namespace :delayed_email_notifications do
	include Rails.application.routes.url_helpers
	# default_url_options[:host] = 'http://localhost:3000'
	default_url_options[:host] = 'https://pynwheel-staging.herokuapp.com' if Rails.env.development?
	default_url_options[:host] = 'https://pynwheelapp.com' if Rails.env.production?

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

	def one_day_before_emails schedual_tours

	  	schedual_tours.each do |schedual_tour|
	  
			begin

		tu = schedual_tour.tour_user
	  	community = schedual_tour.community
	  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
			android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
			community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincolon Property Company Self Tour" : "Pynwheel Self Tour"
			# content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/> We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")} tomorrow for your self-guided tour. <br/>Download Pynwheel Self Tour:<br><a href=#{app_link} target='_blank'>Download Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a>. <br><br/><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"
			content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name}' /></div><br/>Don't forget! You have an appointment for a Self Tour tomorrow at <b>#{community.name if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive. <br>iPhone Users: <a href=#{app_link} target='_blank'>Download #{community_text} from the App Store</a>. <br>Android Users: <a href=#{app_link} target='_blank'>Download #{community_text} from Google Play</a><br><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"
			sms_content = "Don't forget! You have an appointment for a Self Tour tomorrow at #{community.name if community.present?} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Make sure you have downloaded the #{community_text} app before you arrive.
iPhone Users: Download #{community_text} from the App Store. #{app_link}
Android Users: Download #{community_text} from Google Play. #{android_link}
Change appointment #{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}
#{community.one_day_email_text}"

			# "Don't forget! You have an appointment for a Self Tour tomorrow at <b>#{community.name.humanize if community.present?}</b> at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}. Make sure you have downloaded the Pynwheel Self Tour (or Lincolon Property Company Self Tour) app before you arrive. <br>iPhone Users: <a href=#{app_link} target='_blank'>Download #{community_text} from the App Store</a>. <br>Android Users: <a href=#{app_link} target='_blank'>Download #{community_text} from Google Play</a><br><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a> <br>#{community.one_day_email_text}"
			# day_diff = (schedual_tour.day_diff-1)
			# day_diff = 0 if day_diff < 0
			# schedual_tour.update_columns(daily_email_sent: true, day_diff: day_diff)
			diff = (schedual_tour.tour_date - (Date.strptime(DateTime.current.in_time_zone(schedual_tour.user_time_zone).strftime("%m/%d/%Y"), "%m/%d/%Y"))) 
			schedual_tour.update_columns(daily_email_sent: true) if diff == 1
			DelayedSchedulerMailerJob.perform_async("Your Tour Tomorrow", content, tu.email,nil,nil,nil) if diff == 1
			DelayedSchedulerTextJob.perform_async(sms_content, tu.phone_number) if diff == 1
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
			  	
			  	# puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
					app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
					community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincolon Property Company Self Tour" : "Pynwheel Self Tour"
					android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
					# content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name.humanize}' /></div><br/>We look forward to having you visit our property(<b>#{community.name.humanize if community.present?}</b>) at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}.<br/><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br/>When you arrive at the property, open: <br><a href=#{app_link} target='_blank'>Pynwheel Self Tour From App Store </a><br><a href=#{android_link} target='_blank'>Download Pynwheel Self Tour from Google Play </a> to start your tour. <br>#{community.one_hour_email_text}"
					content = "<div style='vertical-align:middle; text-align:center'><img style='width: 150px; max-height: 55px;' src='#{community.logo.url}' data-title='#{community.name}' /></div><br/>Your self-guided tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br>Open #{community_text} for iPhones <a href=#{app_link} target='_blank'>link</a><br>Open #{community_text} for Android <a href=#{android_link} target='_blank'>link</a> <br>#{community.one_hour_email_text}"
					sms_content = "Your self-guided tour starts soon!
Here are directions to #{community.name}  https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}
When you arrive at the property, open the #{community_text} app to begin your tour.
Open #{community_text} for iPhones #{app_link}
Open #{community_text} for Android #{android_link}
#{community.one_hour_email_text}"
					# "Your self-guided tour starts soon!<br><a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br>When you arrive at the property, open the #{community_text} app to begin your tour.<br>Open #{community_text} for iPhones <a href=#{app_link} target='_blank'>link</a><br>Open #{community_text} for Android <a href=#{app_link} target='_blank'>link</a> <br>#{community.one_hour_email_text}"
					schedual_tour.update_columns(hourly_email_sent: true)
					DelayedSchedulerMailerJob.perform_async("Your self-guided tour starts soon!", content, tu.email,nil,nil,nil)
					DelayedSchedulerTextJob.perform_async(sms_content, tu.phone_number)
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

end