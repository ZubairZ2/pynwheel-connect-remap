# frozen_string_literal: true

# The one-time code sent to a phone number by the Tour App's visitor sign-in
# (`Visitors::Otp`): one row per phone, the code only as a digest, with the
# attempt and daily send counters the limits read. Deleted once verified.
# Nothing here touches the legacy `tour_users.pin_code`.
class VisitorOtp < ApplicationRecord
  validates :phone_number, :code_digest, :expires_at, presence: true

  def expired?(now = Time.current)
    expires_at <= now
  end
end
