# frozen_string_literal: true

module Visits
  # The check-in rules of the legacy app's `user_tour_status`, re-expressed
  # for the new Tour App's visits (October 23, 2026): the property's visiting
  # hours (`opening_hours`, compared as the legacy SQL does), the 1 km radius
  # (`DweloDevicesHelper#geo_distance`), and the booking window (booked time
  # plus or minus the tour's grace period, as Visitors::Status counts it).
  module Rules
    RADIUS_KM = 1
    TOUR_TYPES = %w[self_tour guided_tour virtual_tour].freeze
    ONSITE_TYPES = %w[self_tour guided_tour].freeze

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
