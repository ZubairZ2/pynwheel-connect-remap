class NotificationMailer < ApplicationMailer
	# default from: 'info@pynwheel.com'
  layout 'mailer'

	def tour_history_mail subject, msg, to,email_from = "info@pynwheel.com",community,show_html
		@community = community
		@email_body = msg
		@show_html = show_html
		mail(to: to, from: email_from, subject: subject)

	end

end
