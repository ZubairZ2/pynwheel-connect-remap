# frozen_string_literal: true

module Visits
  # Where the visitor is during a visit, from the `location` events the Tour
  # App reports in the foreground (October 28, 2026). The legacy
  # `alerts_during_tour` emailed "Visitor has departed" on the single last fix
  # of a batch beyond 1 km, so one stray reading could send it; here a
  # departure is confirmed only after CONFIRM_FIXES readings beyond the radius
  # plus BUFFER_M, spread over at least CONFIRM_MINUTES, and the property is
  # told once per visit. A reading inside the radius resets the count (and
  # marks a return after a departure, without a second email); a reading that
  # is stale, out of order, repeated, too coarse to place the phone, or from a
  # property without coordinates changes nothing. Only the last reading that
  # counted is kept, never the track.
  class Presence
    CONFIRM_FIXES = 3
    CONFIRM_MINUTES = 5
    BUFFER_M = 250
    MAX_FIX_AGE = 15.minutes
    STATES = %w[on_site away].freeze
    OUTCOMES = %w[disabled offsite ignored duplicate unverified on_site leaving departed away returned].freeze

    Fix = Struct.new(:latitude, :longitude, :accuracy_m, :occurred_at, :client_event_id, keyword_init: true)

    def self.apply!(community, visit, fix, now:, whodunnit: nil)
      new(community, visit, now: now, whodunnit: whodunnit).apply!(fix)
    end

    def initialize(community, visit, now:, whodunnit: nil)
      @community = community
      @visit = visit
      @now = now
      @whodunnit = whodunnit
    end

    # The outcome as a word (one of OUTCOMES), answered to the app per event.
    def apply!(fix)
      return 'disabled' unless Connect::Flags.tour_presence_enabled?
      return 'offsite' unless @visit.tour_site == 'onsite'
      return 'duplicate' if fix.client_event_id && @visit.last_location_event_id == fix.client_event_id
      return 'ignored' if fix.occurred_at < @now - MAX_FIX_AGE
      return 'ignored' if @visit.last_fix_at && fix.occurred_at <= @visit.last_fix_at

      proximity, distance_m = Rules.proximity(@community, fix.latitude, fix.longitude, fix.accuracy_m)
      return 'unverified' unless %w[verified outside].include?(proximity)

      columns = { last_fix_at: fix.occurred_at, last_fix_distance_m: distance_m, last_fix_accuracy_m: fix.accuracy_m&.round, last_location_event_id: fix.client_event_id }
      beyond = proximity == 'outside' && distance_m >= Rules::RADIUS_KM * 1000 + BUFFER_M
      outcome = beyond ? leaving(columns, fix) : staying(columns, fix)
      @visit.update_columns(columns)
      notify_departure! if outcome == 'departed' && @visit.departed_notified_at.nil?
      outcome
    end

    private

      def staying(columns, fix)
        returned = @visit.presence_state == 'away'
        columns.merge!(presence_state: 'on_site', outside_since: nil, outside_fix_count: 0)
        columns[:returned_at] = fix.occurred_at if returned
        returned ? 'returned' : 'on_site'
      end

      def leaving(columns, fix)
        since = @visit.outside_since || fix.occurred_at
        count = @visit.outside_fix_count.to_i + 1
        columns.merge!(outside_since: since, outside_fix_count: count)
        return 'away' if @visit.presence_state == 'away'
        return 'leaving' unless count >= CONFIRM_FIXES && fix.occurred_at - since >= CONFIRM_MINUTES.minutes

        columns[:presence_state] = 'away'
        'departed'
      end

      # The legacy departure email, once per visit; a failure to send never
      # fails the event (the state is already written).
      def notify_departure!
        @visit.update_columns(departed_notified_at: @now)
        TourApi::Audit.record(@community, 'visit_departed', whodunnit: @whodunnit, payload: { visit_id: @visit.id, tour_user_id: @visit.tour_user_id })
        name = @visit.tour_user&.name.to_s.titleize.presence || 'A visitor'
        booking = @visit.schedual_tour_id && @community.schedual_tours.find_by(id: @visit.schedual_tour_id)
        @community.email.to_s.delete(' ').split(',').reject(&:blank?).each do |email|
          NotificationMailer.tour_history_mail('Visitor has departed', "#{name} has left #{@community.name}", email, 'info@pynwheel.com', @community, false, booking).deliver
        end
      rescue StandardError => e
        Rails.logger.warn("[visits] departure email not sent for visit #{@visit.id}: #{e.class}")
      end
  end
end
