class NotificationMailer < ApplicationMailer
	# default from: 'info@pynwheel.com'
  layout 'mailer'

	def tour_history_mail subject, msg, to,email_from = "info@pynwheel.com",community,show_html,schedule_tour
		@community = community
		@app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
		@android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
    	@property_tour_type = schedule_tour.property_tour_type if schedule_tour.present?
		@tour_type = schedule_tour.tour_type if schedule_tour.present?
		@id_verification = @community.tour.visual_id_verification
		schedSelfTourData = SchedulerWidgetConstants::SCHED_SELF_TOUR_DATA
		schedGuidedTourData = SchedulerWidgetConstants::SCHED_GUIDED_TOUR_DATA
		@unschedSelfTour = SchedulerWidgetConstants::UNSCHED_SELF_TOUR_DATA
		remoteTourData = [
			{
				key: 1,
				image: "instruction-1.png",
				title: "Install App and Choose Property",
				text: "Install the app and choose #{@community.name} from the list of properties to start your remote tour.",
				background: "#e2f5ff"
			},
			{
				key: 2,
				image: "instruction-2.png",
				title: "Start Tour Virtually",
				text: "After selecting property choose to start virtual tour and select apartments and amenities you want to visit.",
				background: "#efffe7"
			},
			{
				key: 3,
				image: "instruction-3.png",
				title: "See Property Images and Navigate",
				text: "The app will show you images of available floor plans and different amenities while navigating from one stop to the next.",
				background: "#ffebe6"
			},
			{
				key: 4,
				image: "instruction-4.png",
				title: "Apply for a Lease or Start Chat",
				text: "Find the home you want? Apply for a lease or talk to property staff directly via live chat.",
				background: "#fcf0ff"
			}
		]
		@data = @property_tour_type == "remote_tour" ? remoteTourData : (@property_tour_type == "scheduled_tour" && @tour_type == "guided_tour") ? schedGuidedTourData : schedSelfTourData if (@property_tour_type or @tour_type).present? 
		str = msg
		start_index = str.index('{')
		end_index = str.index('}')
		middle_index = str.index(',')
		while start_index.present? and end_index.present? and middle_index.present? do
			if start_index < end_index
				word = str[start_index..end_index] rescue nil
				if word.present? && word.include?(',')
					link, text = str[start_index+1..end_index-1].split(',')
					link = "<a href=#{link} target='_blank'>#{text}</a>"
					str = str.sub(word,link)
				end
			else
				str.sub('{','')
				str.sub('}','')
			end
			start_index = str.index('{')
			end_index = str.index('}')
			middle_index = str.index(',')
		end
	
		@email_body = str
		@show_html = show_html
		mail(to: to, from: email_from, subject: subject)

	end

end
