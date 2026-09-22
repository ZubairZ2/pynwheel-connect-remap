# Delivers a partner's Partner Maps API key.
#
# What travels by email is the one-time link, never the key itself: it can be
# opened exactly once and expires, so a message that is forwarded, archived or
# intercepted after the partner has used it is worth nothing.
class PartnerKeyMailer < ApplicationMailer
  layout 'mailer'

  def api_key_link(recipient:, partner_label:, reveal_url:, expires_in_hours:)
    @partner_label    = partner_label
    @reveal_url       = reveal_url
    @expires_in_hours = expires_in_hours

    mail(to: recipient, subject: "Your Pynwheel Partner API key")
  end
end
