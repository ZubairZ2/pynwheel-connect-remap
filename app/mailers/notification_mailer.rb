class NotificationMailer < ApplicationMailer
	default from: 'info@pynwheel.com'
  layout 'mailer'

	def tour_history_mail subject, msg
		mail(to: 'arslan.mirza@intagleo.com', subject: subject, body: msg)
	end
	
end
