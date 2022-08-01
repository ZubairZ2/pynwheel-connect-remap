class InviteMailer < ApplicationMailer
    default from: 'support@pynwheel.com'
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

    def pynwheel_both_invite_email(user)
        @resource = user
        @email = @resource.email
        mail(to: @email, subject: "Welcome to Pynwheel Connect and Pynwheel Launch!")
    end
end