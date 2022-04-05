class FollowUpMailer < ApplicationMailer
  default from: 'info@pynwheel.com'
  layout 'mailer'

  def application_not_started(forms, users)
    @forms = forms
    @users = users
    mail(to: users.first.email, subject: 'No content received yet! is there anything pynwheel can help with?')
  end

  def application_in_progess(forms, users)
    @forms = forms
    @users = users
    mail(to: "fahad.umer@gmail.com", subject: 'Some content was received to pynwheel, but not all')
  end

end
