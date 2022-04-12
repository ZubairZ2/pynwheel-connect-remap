class FollowUpMailer < ApplicationMailer
  default from: 'info@pynwheel.com'
  layout 'mailer'

  def preview_application_not_started(forms)
    @forms = forms
    mail()
  end

  def preview_application_in_progess(forms)
    @forms = forms
    mail()
  end

  def send_submitted_form(community, form_submitted, data)
    @forms = data
    @community = community
    @form_submitted = form_submitted
    mail(to: "support@pynwheel.com", subject: "#{@community.name} - Data submitted for review")
  end

  def send_moved_to_production(community)
    @community = community
    @emails = @community.users.pluck(:email)
    mail(to: @emails, subject: "#{@community.name} - Moved to Production")
  end

  def send_email(users, subject, body)
    @body = body
    @users = users
    @users.each do |user|
      mail(to: user, subject: subject)
    end
  end

end
