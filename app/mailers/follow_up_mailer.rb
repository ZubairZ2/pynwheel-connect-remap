class FollowUpMailer < ApplicationMailer
  default from: ENV["FOLLOW_UP_EMAIL_FROM"]
  layout 'mailer'

  # Turned off 2026-08-12. Gates the two client-facing launch emails:
  # `application_approved` and `released_application_email` (which also copy
  # the support inbox). The mailer methods and views are left intact -- flip
  # this back to true to resume sending.
  SEND_CLIENT_LAUNCH_EMAILS = false

  def preview_application_not_started(forms, community)
    @community = community
    @forms = forms
    mail()
  end

  def preview_application_in_progess(forms, community)
    @community = community
    @forms = forms
    mail()
  end

  def self.send_email_after_form_submission(community, form, previous_status)
    unless community.company.name.include?("Dwelo")
      email = PynwheelLaunch::Communities::FollowUpEmails.new(community).send_emails
      email[:data].each do |mail|
        if mail[:name].eql?(form) && mail[:status].eql?('Submitted')
          if !previous_status[0].nil?
            if previous_status[0][:name].eql?(REJECTED)
              send_re_submitted_form(community, form, email[:data]).deliver
            else
              send_submitted_form(community, form, email[:data]).deliver
            end
          else
            send_submitted_form(community, form, email[:data]).deliver
          end
        end
      end
    end
  end

  def preview_appliation_submit_for_review(community, user)
    @community = community
    @user = user
    @apps_text = get_apps_text(community)
    mail()
  end

  def send_submitted_form(community, form_submitted, data)
    @forms = data
    @community = community
    @form_submitted = form_submitted
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "#{@community.name} - Form submitted for review")
  end

  def send_re_submitted_form(community, form_submitted, data)
    @forms = data
    @community = community
    @form_submitted = form_submitted
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "#{@community.name} - Form re-submitted for review after report")
  end

  def send_moved_to_production(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Final Approval for #{@community.company.name} - #{@community.name}")
  end

  def marketing_email(community)
    @apps_text = get_apps_text(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Marketing: Send Welcome Kit to #{@community.company.name} - #{@community.name}")
  end

  def customer_success_email(community)
    @apps_text = get_apps_text(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Customer Success: Schedule Orientation for #{@community.company.name} - #{@community.name}")
  end
  
  def accounting_email(community)
    @apps_text = get_apps_text(community)
    @community = community
    mail(to: ENV["FOLLOW_UP_EMAIL"], subject: "Accounting: Set up recurring billing for #{@community.company.name} - #{@community.name}")
  end

  def self.non_production_communities_email(community, forms)
    @community = community
    @users = community.users.pluck(:email)
    @users.each do |user|
      send_non_production_emails(community, user, forms).deliver if is_user_not_dwelo(user)
    end
  end

  def send_non_production_emails(community, user, forms)
    @user = user
    @community = community
    @forms = forms  
    mail(to: user, subject: "Your Application for #{@community.company.name} - #{@community.name}")
  end

  def self.application_approved(community)
    return unless SEND_CLIENT_LAUNCH_EMAILS

    unless community&.company&.name.include?("Dwelo")
      users = community.users.pluck(:email)
      users.each do |user|
        send_application_approved_email(community, user).deliver if is_user_not_dwelo(user)
      end
    end
  end

  def send_application_approved_email(community, user)
    @user = user
    @community = community
    mail(to: @user, cc: ENV["FOLLOW_UP_EMAIL"], subject: "#{@community.name} - Your Application is Going into Production")
  end

  def self.released_application_email(community)
    return unless SEND_CLIENT_LAUNCH_EMAILS

    @community = community
    @users = @community.users.pluck(:email)

    @users.push(ENV["FOLLOW_UP_EMAIL"])
    if community.touchscreen_app && !community.self_tour
      @users.each do |user|
        released_app_touch(user, community).deliver if is_user_not_dwelo(user)
      end
    elsif !community.touchscreen_app && community.self_tour
      @users.each do |user|
        released_app_self_tour(user, community).deliver if is_user_not_dwelo(user)
      end
    elsif community.touchscreen_app && community.self_tour
      @users.each do |user|
        released_app_self_tour_touch(user, community).deliver if is_user_not_dwelo(user)
      end
    end
  end

  def released_app_self_tour(user, community)
    @app_text = get_apps_text(community)
    @community = community
    @user = user
    mail(to: @user, subject: "Your Pynwheel Application has been completed for #{@community.company.name} - #{@community.name}")
  end

  def released_app_self_tour_touch(user, community)
    @community = community
    @user = user
    mail(to: @user, subject: "Your Pynwheel Application has been completed for #{@community.company.name} - #{@community.name}")
  end

  def released_app_touch(user, community)
    @community = community
    @user = user
    mail(to: @user, subject: "Your Pynwheel Application has been completed for #{@community.company.name} - #{@community.name}")
  end

  def self.send_email_request(users, subject, body)
    users.each do |user|
      send_email(user, subject, body).deliver if is_user_not_dwelo(user)
    end
  end

  def send_email(user, subject, body)
    @body = body
    @users = user
      mail(to: @users, subject: subject)
  end

  def get_apps_text community
    map_app = false
    self_tour = false
    pynwheel_touch = false
    if community.product_options.nil?
      self_tour = community.self_tour
      pynwheel_touch = community.touchscreen_app
    else
      product_options = JSON.parse(community.product_options)
      self_tour = product_options["product_options"]["self_tour"]["is_enabled"]
      pynwheel_touch = product_options["product_options"]["pynwheel_touch"]["is_enabled"]
      map_app = product_options["product_options"]["pynwheel_maps"]
    end
    "#{pynwheel_touch ? 'Touch App':''}#{pynwheel_touch && (self_tour) ? ', ':''}#{self_tour ? 'Pynwheel Tour App':''}#{(pynwheel_touch || self_tour ) && map_app ? ', ' : ''}#{map_app ? 'Map' : ''}"
  end

  def self.is_user_not_dwelo(email)
    if email.present?
      user = User.find_by(email: email)
      unless user.nil?
        return user.role.eql?("Dwelo admin") ? false : true
      else
        true
      end
    end
  end

end
