# frozen_string_literal: true

module Bookings
  # Cancelling a booking, as the legacy Scheduled Tours page and Connect do
  # it: the row is destroyed, its callbacks cancel the CRM appointment and
  # mail the property, PaperTrail keeps the destroy version the Cancelled
  # tab reads, and one audit version names who cancelled (`whodunnit`: a
  # staff user id or `visitor:<id>`) and from where (`source`). Shared by
  # Connect and the Tour App API since October 23, 2026.
  class Cancel
    def self.call!(community, booking, whodunnit: nil, source: 'connect')
      visitor = booking.tour_user
      booking.destroy!
      PaperTrail::Version.create!(
        item_type: 'Community', item_id: community.id, event: 'booking_cancelled', whodunnit: whodunnit.to_s.presence,
        community_id: community.id, company_id: community.company_id,
        object: { booking_id: booking.id, tour_user_id: visitor&.id, source: source }.to_json
      )
      booking
    rescue ActiveRecord::RecordNotDestroyed, ActiveRecord::RecordInvalid => e
      raise Connect::DomainError.invalid('cancel_failed', e.message)
    end
  end
end
