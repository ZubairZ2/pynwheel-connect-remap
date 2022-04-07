class FollowUpMailer < ApplicationMailer
  default from: 'info@pynwheel.com'
  layout 'mailer'

  def application_not_started(forms, users)
    @forms = forms
    @users = users
    mail(to: users.first.email, subject: 'No content received yet! is there anything pynwheel can help with?')
  end

  def preview_application_in_progess(forms)
    @forms = forms
    mail()
  end

  def send_email(users, subject, body)
    @body = body
    @users = users
    @users.each do |user|
      mail(to: user, subject: subject)
    end
  end

end
