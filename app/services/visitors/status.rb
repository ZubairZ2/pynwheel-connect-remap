# frozen_string_literal: true

module Visitors
  # The lifecycle of a booking and of a visit, as the legacy CMS derives it
  # (there is no status column):
  #   booking   completed  `is_tour_completed` (set when the app posts the end of a tour)
  #             upcoming   not completed and booked time + grace > now (SchedualToursHelper#is_tour_in_future);
  #                        an unscheduled visit with no date stays open until completed
  #             missed     not completed and the booked time + grace has passed (the datatable's "expired")
  #             cancelled  the booking was destroyed (its PaperTrail version)
  #   visit     in_progress  arrived, not left, not abandoned, the app still active, within the
  #                          app's 2-hour window (DweloDevicesHelper#app_usage)
  #             completed    `left` set (tour_state "completed")
  #             abandoned    `abandoned_tour_at_stop` set, the app went inactive, or no end was
  #                          ever posted (tour_state stays "abandoned", its default)
  # A visitor's row carries the visit's "abandoned" as its own status: the
  # October 20, 2026 design labels such a row "Abandoned" and counts it under
  # the Completed chip; Visitors::Query keeps both facts (a distinct status
  # and the chip's count), so the state is never folded into "completed".
  module Status
    ACTIVE_WINDOW = 120.minutes
    # The legacy rule (CommunitiesHelper, tour_users/index.html.haml): an
    # Authenteq / CheckpointID verification is good for 30 days.
    VERIFIED_FOR = 30.days

    module_function

    def tz(community)
      community.get_time_zone
    end

    def booked_at(booking, zone)
      return nil unless booking.tour_date.present? && booking.tour_time.present?

      "#{booking.tour_date} #{booking.tour_time.strftime('%I:%M%p')}".in_time_zone(zone)
    end

    def grace_minutes(community)
      (community.community_tour&.grace_period || 10).to_i
    end

    # `grace:` lets a caller that classifies many bookings resolve the
    # property's grace period once (`community_tour` is a query every call:
    # Visitors::Query and Profile pass it in; see the October 17, 2026 QA pass).
    def booking_status(booking, community, now, grace: nil)
      return 'cancelled' if booking.respond_to?(:cancelled?) && booking.cancelled?
      return 'completed' if booking.is_tour_completed

      at = booked_at(booking, now.time_zone)
      return 'upcoming' if at.nil?

      at + (grace || grace_minutes(community)).minutes > now ? 'upcoming' : 'missed'
    end

    def visit_status(history, now)
      return 'completed' if history.left.present?
      return 'abandoned' if history.abandoned_tour_at_stop.present?
      return 'abandoned' if history.active_app == false

      arrived = history.arrived
      arrived.present? && arrived > now - ACTIVE_WINDOW ? 'in_progress' : 'abandoned'
    end

    # When the app reported a stop: `visited_stops` keeps the event's date
    # and its time of day in two columns, both the wall clock the app sent
    # (the device's, which on site is the property's; the legacy page prints
    # those digits as they are). The instant is that wall clock in the
    # property's zone; a row without them falls back to when it was written.
    def stop_instant(row, zone)
      if row.event_date.present? && row.event_time.present?
        t = row.event_time.utc
        zone.local(row.event_date.year, row.event_date.month, row.event_date.day, t.hour, t.min, t.sec)
      else
        row.created_at
      end
    end

    # The app's `stop_pin` is whatever text the stop showed stripped of
    # "Use code … to enter.": a door code, or a vendor instruction ("Tap the
    # unlock button…"). Only a code-shaped value is a code.
    CODE_SHAPE = /\A[0-9#*][0-9#* -]{1,14}\z/

    def stop_code(value)
      value = value.to_s.strip
      value.match?(CODE_SHAPE) ? value : nil
    end

    def stop_instruction(value)
      value = value.to_s.strip
      value.present? && !value.match?(CODE_SHAPE) ? value : nil
    end

    def visit_elapsed_minutes(history, now)
      return nil if history.arrived.blank?

      (((history.left || now) - history.arrived) / 60).round
    end

    # ID verification as the Visitors page shows it: flagged as a mismatch,
    # verified within the last 30 days by Authenteq or CheckpointID (with the
    # time it was done and when it lapses), lapsed (verified, but more than
    # 30 days ago: the app asks again), or never.
    def id_check(tour_user, now)
      return { state: 'mismatch', label: 'Mismatch flagged', at: nil, provider: nil, valid_until: nil } if tour_user.id_selfie_mismatch

      candidates = []
      candidates << ['Authenteq', tour_user.authentiq_verified_at] if tour_user.is_authentiq_verified && tour_user.authentiq_verified_at.present?
      candidates << ['CheckpointID', tour_user.checkpoint_verified_at] if tour_user.is_checkpoint_verified && tour_user.checkpoint_verified_at.present?
      provider, verified_at = candidates.max_by { |_provider, at| at.to_i }
      return { state: 'never', label: 'Never verified', at: nil, provider: nil, valid_until: nil } if verified_at.nil?

      valid_until = verified_at + VERIFIED_FOR
      if valid_until > now
        { state: 'verified', label: 'Verified', at: verified_at, provider: provider, valid_until: valid_until }
      else
        { state: 'expired', label: 'Verification lapsed', at: verified_at, provider: provider, valid_until: valid_until }
      end
    end

    TYPE = { 'self_tour' => 'self', 'guided_tour' => 'guided', 'guided' => 'guided', 'virtual_tour' => 'virtual', 'Virtual Tour' => 'virtual', 'Virtual tour' => 'virtual', 'Self Guided' => 'self', 'Self guided' => 'self' }.freeze
    TYPE_LABEL = { 'self' => 'App Guided Tour', 'guided' => 'Person Guided Tour', 'virtual' => 'Virtual Tour', 'walkin' => 'Walk-in' }.freeze
    STATUS_LABEL = { 'upcoming' => 'Upcoming', 'in_progress' => 'In progress', 'completed' => 'Completed', 'abandoned' => 'Abandoned', 'missed' => 'Missed', 'cancelled' => 'Cancelled' }.freeze
    # `created_by` as the writers set it: the public widget ("Pynwheel", its
    # column default), Connect ("Staff"), the Pynwheel Tour app ("Tour App"),
    # the Salesforce and PERQ webhooks, and the Apartments.com partner API.
    SOURCE = { 'Pynwheel' => 'Booking form', 'Staff' => 'Staff', 'Tour App' => 'Tour App', 'salesforce' => 'Salesforce', 'PERQ' => 'PERQ', 'Appartments.com' => 'Apartments.com' }.freeze

    # The tour type of a booking, from `tour_type` and — for a remote visit
    # booked as `property_tour_type` "remote_tour" — the visit kind
    # (SchedualTour#scheduled_tour_type calls both "Virtual Tour"). A blank
    # or unknown `tour_type` is the column's default, a self-guided tour.
    def tour_type_key(booking)
      raw = booking.tour_type.to_s
      return 'virtual' if booking.respond_to?(:property_tour_type) && booking.property_tour_type.to_s == 'remote_tour'
      return TYPE[raw] if TYPE.key?(raw)
      return 'virtual' if raw.downcase.include?('virtual') || raw.downcase.include?('remote')
      return 'guided' if raw.downcase.include?('guided') && !raw.downcase.include?('self')

      'self'
    end

    def source_label(created_by)
      SOURCE[created_by.to_s] || created_by.to_s.presence || 'Booking form'
    end
  end
end
