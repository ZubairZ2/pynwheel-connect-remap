class NotifyEmailMailer < ApplicationMailer
  def send_notification(to:, cc:, subject:, html:)
    mail(
      to: to,
      cc: cc.presence,
      subject: subject,
      content_type: 'text/html',
      body: html
    )
  end
end