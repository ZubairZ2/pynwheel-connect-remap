class ScheduledToursMailer < ApplicationMailer
    default from: 'info@pynwheel.com'
    layout 'mailer'

    def schuduled_tours_email subject, data, community
        @community_name = community.name.split(' ').map(&:capitalize).join(' ')
        @tours_data = data
        mail(to: community.email, subject: subject)
    end

end