namespace :delayed_email_notifications do
	include Rails.application.routes.url_helpers
	# default_url_options[:host] = 'http://localhost:3000'
	default_url_options[:host] = 'https://pynwheel-staging.herokuapp.com'

	desc "This delayed email task is called every day by the Heroku scheduler add-on"

	task :one_day_before => :environment do
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Fetching Today Tours >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	  schedual_tours = SchedualTour.where('tour_date = ? AND daily_email_status = ?', Date.today+1, true)
	  one_day_before_emails schedual_tours
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Done: Fetching Today #{schedual_tours.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"
	end

	desc "This delayed email task is called every hour by the Heroku scheduler add-on"
	task :one_hour_before => :environment do
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Fetching Hour Left Tours >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
	 	schedual_tours = SchedualTour.where('tour_date = ? AND tour_time >= ? AND tour_time <= ?', Date.today, Time.current+5.hours, (Time.current + 6.hour))

	 	failed_schedual_tours = SchedualTour.where('tour_date = ? AND tour_time <= ? AND hourly_email_sent = ?', Date.today, Time.current+5.hours - 10.minutes, false)

	 	one_hour_before_emails schedual_tours
	 	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Trying: Failed Hour Left Emails #{failed_schedual_tours.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"
	 	one_hour_before_emails failed_schedual_tours
	  puts "<<<<<<<<<<<<<<<<<<<<<<<<< Done: Fetching Hour Left #{schedual_tours.size } Tours >>>>>>>>>>>>>>>>>>>>>>>>"

	end

	def one_day_before_emails schedual_tours

	  schedual_tours.each do |schedual_tour|
			
			tu = schedual_tour.tour_user
	  	community = schedual_tour.community
	  	
	  	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			
			content = "We look forward to having you visit our property at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")} tomorrow for your self-guided tour. <br/>Download Pynwheel Self Tour <a href='https://apps.apple.com/us/app/pynwheel/id876032030' target='_blank'> Download Pynwheel Self Tour </a>. <br/><a href='#{schedular_widget_change_tour_time_url(schedual_tour)}?datetime=#{get_date_time_combined(schedual_tour.tour_date, schedual_tour.tour_time).to_s}'>Change appointment</a>"

			schedual_tour.update_columns(daily_email_sent: true)
			DelayedSchedulerMailerJob.perform_async("Your Tomorrow Tour", content, tu.email)
	  	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
		end

	end

	def one_hour_before_emails schedual_tours

		schedual_tours.each do |schedual_tour|
			
			tu = schedual_tour.tour_user
	  	community = schedual_tour.community
	  	
	  	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sending Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
			
			content = "<a href=' https://www.google.com/maps/search/?api=1&query=#{community.latitude},#{community.longitude}'>Directions to Property</a><br/>When you arrive at the property, open <a href='https://apps.apple.com/us/app/pynwheel/id876032030' target='_blank'> Pynwheel Self Tour </a> to start your tour."

			schedual_tour.update_columns(hourly_email_sent: true)
			DelayedSchedulerMailerJob.perform_async("Your self-guided tour starts soon!", content, tu.email)
	  	puts "<<<<<<<<<<<<<<<<<<<<<<<<< Sent Email To #{tu.email} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
		end
	end

	def get_date_time_combined date, time
	  DateTime.new(date.year, date.month, date.day, time.hour, time.min, time.sec, time.zone)
	end

end