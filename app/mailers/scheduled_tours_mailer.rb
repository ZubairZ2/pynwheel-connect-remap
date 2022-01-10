class ScheduledToursMailer < ApplicationMailer
  default from: 'info@pynwheel.com'
  layout 'mailer'

  def schuduled_tours_email subject, data, community
    @community_name = community.name.split(' ').map(&:capitalize).join(' ')
    @tours_data = data
    @today_date = Time.now.in_time_zone(DEFAULT_TIME_ZONE).to_date.strftime("%m/%d/%Y")
    emails = community.email.gsub(" ","").split(',')

    emails.each do |email|
      mail(to: email, subject: subject)
    end

  end

end