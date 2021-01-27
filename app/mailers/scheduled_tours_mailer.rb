class ScheduledToursMailer < ApplicationMailer
    default from: 'info@pynwheel.com'
    layout 'mailer'

    def schuduled_tours_email subject, data, community
        @community_name = community.name.split(' ').map(&:capitalize).join(' ')
        @tours_data = data
        emails = community.email.gsub(" ","").split(',')
        emails.each do |email|
        	mail(to: email, subject: subject)
        end
        # mail(to: community.email, subject: subject)
    end

end