class NotificationMailer < ApplicationMailer
	default from: 'info@pynwheel.com'
 #  layout 'mailer'

	def tour_history_mail subject, msg
		mail(to: 'nasir.shamshad@intagleo.com', subject: subject, body: msg).deliver_now
	end
end
