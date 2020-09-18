class NotificationMailer < ApplicationMailer
	# default from: 'info@pynwheel.com'
  layout 'mailer'

	def tour_history_mail subject, msg, to, email_from
		@email_body = msg
		if (subject == "Your Tour Tomorrow" or subject == "Your Tour Tomorrow" or subject == "Your tour starts soon!" or subject == "Tour has been scheduled")
			mail(to: to, from: email_from, subject: subject)
		else
			mail(to: to, from: "info@pynwheel.com", subject: subject)
			# mail(to: to, subject: subject, body: msg)
		end
	end

end
