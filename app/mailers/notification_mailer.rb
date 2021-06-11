class NotificationMailer < ApplicationMailer
	# default from: 'info@pynwheel.com'
  layout 'mailer'

	def tour_history_mail subject, msg, to,email_from = "info@pynwheel.com",community,show_html
		@community = community
		@app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
		@android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
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
