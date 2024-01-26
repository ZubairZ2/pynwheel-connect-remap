class LatchInvitationMailer < ApplicationMailer
  layout 'mailer'

  def send_latch_integration_invite_mail(to_email, from_email, subject, body)
    @email_body = body
    mail(to: to_email, from: from_email, subject: subject)
  end
end