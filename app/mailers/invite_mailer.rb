class InviteMailer < ApplicationMailer
    default from: 'info@pynwheel.com'
    layout 'mailer'

    def pynwheel_launch_invite_email(user)
        @resource = user
        @email = @resource.email
        mail(to: @email, subject: "Welcome to Pynwheel Launch!")
    end

    def pynwheel_connect_invite_email(user)
        @resource = user
        @email = @resource.email
        mail(to: @email, subject: "Welcome to Pynwheel Connect!")
    end
end