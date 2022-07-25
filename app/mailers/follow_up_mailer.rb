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
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "#{@community.name} - Data submitted for review")
  end

  def self.non_production_communities_email(community, forms)
    @users = community.users.pluck(:email)
    @users.each do |user|
      send_non_production_emails(community, user, forms).deliver
    end

  end

  def send_non_production_emails(community, user, forms)
    @user = user
    @community = community
    @forms = forms  
    mail(to: user, subject: "Your Application for #{@community.company.name} - #{@community.name}")
  end

  def send_moved_to_production(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Final Approval for #{@community.company.name} - #{@community.name}")
  end

  def marketing_email(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Marketing: Send Welcome Kit to #{@community.company.name} - #{@community.name}")
  end

  def customer_success_email(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Customer Success: Schedule Orientation for #{@community.company.name} - #{@community.name}")
  end
  
  def accounting_email(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Accounting: Set up recurring billing for #{@community.company.name} - #{@community.name}")
  end

  def self.released_application_email(community)
    @community = community
    @users = @community.users.pluck(:email)
    @users.push(ENV["FOLLOW_UP_EMAIL"])
    if community.touchscreen_app && !community.self_tour
      @users.each do |user|
        released_app_touch(user, community).deliver
      end
    elsif !community.touchscreen_app && community.self_tour
      @users.each do |user|
        released_app_self_tour(user, community).deliver
      end
    elsif community.touchscreen_app && community.self_tour
      @users.each do |user|
        released_app_self_tour_touch(user, community).deliver
      end
    end
  end

  def released_app_self_tour(user, community)
    @community = community
    @user = user
    mail(to: @user, subject: "Your Pynwheel Applications have been completed!")
  end

  def released_app_self_tour_touch(user, community)
    @community = community
    @user = user
    mail(to: @user, subject: "Your Pynwheel Applications have been completed!")
  end

  def released_app_touch(user, community)
    @community = community
    @user = user
    mail(to: @user, subject: "Your Pynwheel Applications have been completed for #{@community.company.name} - #{@community.name}")
  end

  def self.send_email_request(users, subject, body)
    users.each do |user|
      send_email(user, subject, body).deliver
    end
  end

  def send_email(user, subject, body)
    @body = body
    @users = user
      mail(to: @users, subject: subject)
  end

end
