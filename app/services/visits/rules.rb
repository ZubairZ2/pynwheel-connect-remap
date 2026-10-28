# frozen_string_literal: true

module Visits
  # The check-in rules of the legacy app's `user_tour_status`, re-expressed
  # for the new Tour App's visits (October 23, 2026): the property's visiting
  # hours (`opening_hours`, compared as the legacy SQL does), the 1 km radius
  # (`DweloDevicesHelper#geo_distance`), and the booking window (booked time
  # plus or minus the tour's grace period, as Visitors::Status counts it).
  module Rules
    RADIUS_KM = 1
    # A fix reported less accurate than this (metres) cannot verify a visitor
    # by itself; the error circle has to settle the question (October 28, 2026).
    ACCURACY_GATE_M = 150
    TOUR_TYPES = %w[self_tour guided_tour virtual_tour].freeze
    ONSITE_TYPES = %w[self_tour guided_tour].freeze
    # The server's verdict on where the phone was at check-in: only `verified`
    # proves the visitor at the property; `outside` proves them away; the
    # `unverified_*` states prove nothing and never count as presence.
    PROXIMITY_STATES = %w[verified outside unverified_no_fix unverified_poor_accuracy unverified_no_property_coords].freeze

    module_function

    def zone(community)
      ActiveSupport::TimeZone[community.get_time_zone] || ActiveSupport::TimeZone['UTC']
    end

    def now(community)
      Time.now.in_time_zone(zone(community))
    end

    # Inside today's visiting hours? (`DweloDevicesHelper#is_tour_in_visiting_hours`)
    def open_now?(community, now)
      local = now.in_time_zone(zone(community))
      community.opening_hours.where('day = ? and opening_time <= ? and closing_time >= ?', local.strftime('%A'), local.strftime('%H:%M'), local.strftime('%H:%M')).exists?
    end

    # nil when the property has no coordinates (never blocks), else whether
    # the phone is within RADIUS_KM of it.
    def within_radius?(community, latitude, longitude)
      return nil if community.latitude.blank? || community.longitude.blank? || latitude.nil? || longitude.nil?

      Geocoder::Calculations.distance_between([latitude, longitude], [community.latitude.to_f, community.longitude.to_f], units: :km) < RADIUS_KM
    rescue StandardError
      nil
    end

    # [verdict, distance in metres or nil] for a phone fix (`accuracy_m` nil
    # when the client reported none). The error circle decides first: a fix
    # whose whole circle lies inside RADIUS_KM is `verified` and one whose
    # whole circle lies outside is `outside`, whatever the accuracy; otherwise
    # a fix coarser than ACCURACY_GATE_M is `unverified_poor_accuracy` and a
    # fine one is judged by its centre. Missing phone or property coordinates
    # (or a distance that cannot be computed) are `unverified_*`, never
    # presence: the legacy helper's "rescue true" is not repeated here.
    def proximity(community, latitude, longitude, accuracy_m = nil)
      return ['unverified_no_fix', nil] if latitude.nil? || longitude.nil?
      return ['unverified_no_property_coords', nil] if community.latitude.blank? || community.longitude.blank?

      distance_m = (Geocoder::Calculations.distance_between([latitude, longitude], [community.latitude.to_f, community.longitude.to_f], units: :km) * 1000).round
      return ['unverified_no_property_coords', nil] unless distance_m.is_a?(Integer)

      radius_m = RADIUS_KM * 1000
      error_m = accuracy_m.to_f
      return ['verified', distance_m] if distance_m + error_m < radius_m
      return ['outside', distance_m] if distance_m - error_m >= radius_m
      return ['unverified_poor_accuracy', distance_m] if error_m > ACCURACY_GATE_M

      [distance_m < radius_m ? 'verified' : 'outside', distance_m]
    rescue StandardError
      ['unverified_no_property_coords', nil]
    end

    # [booked instant, on time?] for a dated booking; [nil, true] for an undated one.
    def booking_window(booking, community, now)
      at = Visitors::Status.booked_at(booking, zone(community))
      return [nil, true] if at.nil?

      grace = Visitors::Status.grace_minutes(community).minutes
      [at, (at - grace) <= now && now <= (at + grace)]
    end

    def access_minutes(community)
      limit = community.community_tour&.tour_setting&.length_stay_limit
      limit.to_i.positive? ? limit.to_i : 45
    end

    def verification_required?(community, visitor, now)
      return false unless community.community_tour&.visual_id_verification

      Visitors::Status.id_check(visitor, now)[:state] != 'verified'
    end

    # A coordinate as the app sends it, or nil; never a string.
    def coordinate(raw, loc:, range:)
      return nil if raw.nil? || raw == ''

      value = Float(raw)
      raise TourApi::ApiError.validation([{ loc: loc, message: "Input should be between #{range.min} and #{range.max}" }]) unless range.cover?(value)

      value
    rescue ArgumentError, TypeError
      raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a valid number' }])
    end

    # An instant the app reports, parsed and kept within a day of now (a
    # phone with a wrong clock cannot date a visit last year); nil → now.
    def instant(raw, now, loc:)
      return now if raw.nil? || raw == ''

      value = Time.iso8601(raw.to_s)
      value.clamp(now - 24.hours, now + 5.minutes)
    rescue ArgumentError
      raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be an ISO 8601 date-time' }])
    end
  end
end
