# One-time delivery of a partner's API key.
#
# The link this serves is the whole secret, so the page is deliberately
# unauthenticated — it is emailed to the partner, who has no Pynwheel login.
# Opening it consumes the token: the key is shown once and is unrecoverable
# afterwards, and the only way to hand over a working key again is to rotate.
class PartnerKeyRevealsController < ActionController::Base
  protect_from_forgery with: :exception
  layout false

  def show
    # Nothing about this response may be stored by a browser or proxy.
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"]        = "no-cache"

    @api_key = PartnerApiKey.consume_reveal(params[:token])
    @expired = @api_key.blank?
  end
end
