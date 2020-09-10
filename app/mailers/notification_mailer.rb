class NotificationMailer < ApplicationMailer
	# default from: 'info@pynwheel.com'
  layout 'mailer'

	def tour_history_mail subject, msg, to, email_from
		@email_body = msg
		mail(to: to, from: email_from, subject: subject)
		# mail(to: to, subject: subject, body: msg)
	end
	
end
