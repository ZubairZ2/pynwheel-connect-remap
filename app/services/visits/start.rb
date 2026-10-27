# frozen_string_literal: true

module Visits
  # Check-in: the visit row (`tour_histories`) the new Tour App starts,
  # written the way the legacy app's `initialize_tour` + first
  # `save_tour_history` wrote it, so Connect's Visitors and the legacy pages
  # show it as a session in progress (October 23, 2026).
  #
  # Idempotent: the same `client_visit_id` answers the same row; a visitor
  # with a visit still open at the property (no end, started within the
  # 120-minute window Visitors::Status counts as active) gets that one back.
  # The booking is linked by id when the app names one (it must be the
  # visitor's own, at this property, and inside its grace window), else the
  # visitor's booking whose window covers now, else none (a walk-in).
  class Start
    Result = Struct.new(:visit, :created, :booking, :within_radius, :in_hours, :verification_required, :proximity, :distance_m, :accuracy_m, keyword_init: true)

    # Why an in-person check-in could not be verified, as the visitor reads it.
    UNVERIFIED_MESSAGES = {
      'unverified_no_fix' => 'We could not confirm your location. Turn on location services and try again.',
      'unverified_poor_accuracy' => 'Your location is not accurate enough to confirm you are at the property. Try again, outdoors if you can.',
      'unverified_no_property_coords' => 'In-person check-in is not available at this property yet.'
    }.freeze

    def self.call!(community, visitor, attrs, staff: nil, now: nil)
      new(community, visitor, staff: staff, now: now).call!(attrs)
    end

    def initialize(community, visitor, staff: nil, now: nil)
      @community = community
      @visitor = visitor
      @staff = staff
      @now = now || Rules.now(community)
    end

    def call!(attrs)
      attrs = attrs.to_h.with_indifferent_access
      tour = @community.community_tour
      raise TourApi::ApiError.unprocessable('tour_disabled', 'This property has no Self-Guided Tour.') if tour.nil?

      client_visit_id = uuid(attrs[:client_visit_id], loc: %w[body client_visit_id])
      existing = client_visit_id && TourHistory.find_by(client_visit_id: client_visit_id, tour_user_id: @visitor.id)
      return reuse(existing, attrs) if existing

      open = open_visit
      return reuse(open, attrs) if open

      booking = booking!(attrs[:booking_id]) || booking_in_window
      requested = attrs[:tour_type].presence || booking&.tour_type.presence || 'self_tour'
      raise TourApi::ApiError.validation([{ loc: %w[body tour_type], message: "Input should be one of #{Rules::TOUR_TYPES.join(', ')}" }]) unless Rules::TOUR_TYPES.include?(requested)

      in_hours = Rules.open_now?(@community, @now)
      tour_type = if !in_hours
                    'virtual_tour'
                  elsif booking && Rules::ONSITE_TYPES.include?(booking.tour_type.to_s)
                    booking.tour_type
                  else
                    requested
                  end
      fix = fix_of(attrs)
      proximity, distance_m = Rules.proximity(@community, fix[:latitude], fix[:longitude], fix[:accuracy_m])
      refuse_unless_present!(proximity, distance_m, fix[:accuracy_m]) if Rules::ONSITE_TYPES.include?(tour_type) && @staff.nil?

      started_at = Rules.instant(attrs[:started_at], @now, loc: %w[body started_at])
      verification_required = Rules.verification_required?(@community, @visitor, @now)
      tour_key = SecureRandom.hex
      visit = nil
      ApplicationRecord.transaction do
        # What the legacy `initialize_tour` and `user_tour_status` wrote on the
        # visitor row; `update_columns` because old rows do not all pass today's validations.
        @visitor.update_columns(tour_type: tour_type, tour_key: tour_key, latitude: fix[:latitude] || @visitor.latitude, longitude: fix[:longitude] || @visitor.longitude, lock_access_time: @now)
        visit = TourHistory.create!(
          tour_user_id: @visitor.id, tour_id: tour.id, community_id: @community.id, schedual_tour_id: booking&.id,
          arrived: started_at, active_app: true, tour_key: tour_key, source: 'tour_app', client_visit_id: client_visit_id,
          tour_site: Rules::ONSITE_TYPES.include?(tour_type) ? 'onsite' : 'offsite', tour_status: tour_type, tour_type: tour_type,
          my_time_zone: attrs[:device_time_zone].to_s[0, 64].presence, community_time_zone: @community.get_time_zone,
          latitude: fix[:latitude], longitude: fix[:longitude], location_received: !fix[:latitude].nil?, verified_by: @visitor.verified_by,
          accuracy_m: fix[:accuracy_m]&.round, fix_at: fix[:fix_at], proximity: proximity,
          desired_bedroom: @visitor.desired_bedroom, id_mismatch: @visitor.id_selfie_mismatch == true, tour_state: 'abandoned'
        )
      end
      TourApi::Audit.record(@community, 'visit_started', whodunnit: whodunnit,
                                                         payload: { visit_id: visit.id, tour_user_id: @visitor.id, booking_id: booking&.id, tour_type: tour_type, source: 'tour_app', app_version: attrs[:app_version].to_s[0, 32].presence })
      Result.new(visit: visit, created: true, booking: booking, within_radius: within_of(proximity), in_hours: in_hours, verification_required: verification_required,
                 proximity: proximity, distance_m: distance_m, accuracy_m: fix[:accuracy_m]&.round)
    end

    private

      # The visit the visitor already has. A fix that arrives with the reuse is
      # judged and answered, and recorded only when the row has none yet (the
      # check-in's verdict is the record of the arrival); it never refuses.
      def reuse(visit, attrs)
        fix = fix_of(attrs)
        proximity, distance_m = Rules.proximity(@community, fix[:latitude], fix[:longitude], fix[:accuracy_m])
        if fix[:latitude].nil?
          proximity = visit.proximity.presence || proximity
        elsif !visit.location_received
          visit.update_columns(latitude: fix[:latitude], longitude: fix[:longitude], location_received: true, accuracy_m: fix[:accuracy_m]&.round, fix_at: fix[:fix_at], proximity: proximity)
        end
        booking = visit.schedual_tour_id && @community.schedual_tours.find_by(id: visit.schedual_tour_id)
        Result.new(visit: visit, created: false, booking: booking, within_radius: within_of(proximity), in_hours: Rules.open_now?(@community, @now),
                   verification_required: Rules.verification_required?(@community, @visitor, @now),
                   proximity: proximity, distance_m: distance_m, accuracy_m: fix[:accuracy_m]&.round || visit.accuracy_m)
      end

      # The phone's fix as the app sent it: coordinates, the reported accuracy
      # (metres) and the fix's own time, each validated and each optional.
      def fix_of(attrs)
        {
          latitude: Rules.coordinate(attrs[:latitude], loc: %w[body latitude], range: -90.0..90.0),
          longitude: Rules.coordinate(attrs[:longitude], loc: %w[body longitude], range: -180.0..180.0),
          accuracy_m: Rules.coordinate(attrs[:accuracy_m], loc: %w[body accuracy_m], range: 0.0..100_000.0),
          fix_at: attrs[:fix_at].present? ? Rules.instant(attrs[:fix_at], @now, loc: %w[body fix_at]) : nil
        }
      end

      # An in-person check-in by a visitor (staff never need it): a fix
      # verified outside the radius is always refused, on every property (the
      # legacy app's rule); one that verifies nothing is refused while
      # PYN_TOUR_LOCATION_REQUIRED is on and recorded as such while it is off.
      def refuse_unless_present!(proximity, distance_m, accuracy_m)
        details = { proximity: proximity, distance_m: distance_m, accuracy_m: accuracy_m&.round, radius_km: Rules::RADIUS_KM }
        raise TourApi::ApiError.unprocessable('outside_property', 'It looks like you are not at the property yet.', details) if proximity == 'outside'
        return if proximity == 'verified' || !Connect::Flags.tour_location_required?

        raise TourApi::ApiError.unprocessable('location_unverified', UNVERIFIED_MESSAGES.fetch(proximity), details.merge(accuracy_gate_m: Rules::ACCURACY_GATE_M))
      end

      # The boolean the app has read since October 23: true/false only when the
      # verdict is one, nil for every unverified state.
      def within_of(proximity)
        case proximity
        when 'verified' then true
        when 'outside' then false
        end
      end

      def open_visit
        TourHistory.where(tour_user_id: @visitor.id, community_id: @community.id, left: nil, source: 'tour_app')
                   .where(abandoned_tour_at_stop: nil).where('arrived > ?', @now - Visitors::Status::ACTIVE_WINDOW).order(:id).last
      end

      # The booking the app named: the visitor's own, at this property, not
      # completed, inside its grace window.
      def booking!(raw)
        return nil if raw.nil? || raw == ''

        id = raw.to_s.match?(/\A\d+\z/) ? raw.to_i : raise(TourApi::ApiError.validation([{ loc: %w[body booking_id], message: 'Input should be a valid integer' }]))
        booking = @community.schedual_tours.find_by(id: id, tour_user_id: @visitor.id)
        raise TourApi::ApiError.not_found('No such booking at this property.') if booking.nil?
        raise TourApi::ApiError.unprocessable('booking_completed', 'That booking is already completed.') if booking.is_tour_completed

        at, on_time = Rules.booking_window(booking, @community, @now)
        unless on_time
          raise TourApi::ApiError.unprocessable('outside_window', 'This booking cannot be checked in now.',
                                                { booked_at: at&.iso8601, grace_minutes: Visitors::Status.grace_minutes(@community) })
        end

        booking
      end

      def booking_in_window
        @community.schedual_tours.where(tour_user_id: @visitor.id, is_tour_completed: [false, nil]).where.not(tour_date: nil).order(:tour_date, :tour_time).find do |booking|
          Rules.booking_window(booking, @community, @now).last
        end
      end

      def uuid(raw, loc:)
        return nil if raw.nil? || raw == ''
        raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a UUID' }]) unless raw.to_s.match?(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i)

        raw.to_s.downcase
      end

      def whodunnit
        @staff ? @staff.id.to_s : "visitor:#{@visitor.id}"
      end
  end
end
