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
  #             abandoned    `abandoned_tour_at_stop` set, or the app went inactive without an end
  module Status
    ACTIVE_WINDOW = 120.minutes
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

    def visit_elapsed_minutes(history, now)
      return nil if history.arrived.blank?

      (((history.left || now) - history.arrived) / 60).round
    end

    # ID verification as the Visitors page shows it: verified within 30 days
    # by Authenteq or CheckpointID, flagged as a mismatch, or never.
    def id_check(tour_user, now)
      return { state: 'mismatch', label: 'Mismatch flagged' } if tour_user.id_selfie_mismatch

      verified_at = [
        (tour_user.is_authentiq_verified ? tour_user.authentiq_verified_at : nil),
        (tour_user.is_checkpoint_verified ? tour_user.checkpoint_verified_at : nil)
      ].compact.max
      if verified_at.present? && verified_at > now - VERIFIED_FOR
        { state: 'verified', label: 'Verified', at: verified_at, provider: tour_user.is_authentiq_verified ? 'Authenteq' : 'CheckpointID' }
      else
        { state: 'never', label: 'Never verified', at: nil, provider: nil }
      end
    end

    TYPE = { 'self_tour' => 'self', 'guided_tour' => 'guided', 'virtual_tour' => 'virtual', 'Virtual Tour' => 'virtual', 'Virtual tour' => 'virtual', 'Self Guided' => 'self' }.freeze
    TYPE_LABEL = { 'self' => 'App Guided Tour', 'guided' => 'Person Guided Tour', 'virtual' => 'Virtual Tour', 'walkin' => 'Walk-in' }.freeze
    SOURCE = { 'Pynwheel' => 'Booking form', 'Staff' => 'Staff', 'salesforce' => 'Salesforce', 'PERQ' => 'PERQ', 'Appartments.com' => 'Apartments.com' }.freeze

    def tour_type_key(booking)
      TYPE[booking.tour_type.to_s] || (booking.tour_type.present? ? booking.tour_type.to_s : 'self')
    end

    def source_label(created_by)
      SOURCE[created_by.to_s] || created_by.to_s.presence || 'Booking form'
    end
  end
end
