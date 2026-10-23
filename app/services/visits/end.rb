# frozen_string_literal: true

module Visits
  # The end of a visit the Tour App reports (October 23, 2026): `left` and
  # `tour_state` as the legacy app's last `save_tour_history` set them (the
  # model's `after_update` then mails the property and completes an on-time
  # scheduled booking exactly as before), plus the linked booking marked
  # completed when the visit was checked in against it. Idempotent: a visit
  # already ended is answered as it is.
  class End
    REASONS = %w[completed abandoned].freeze

    def self.call!(community, visit, attrs, whodunnit:, now: nil)
      new(community, visit, whodunnit: whodunnit, now: now).call!(attrs)
    end

    def initialize(community, visit, whodunnit:, now: nil)
      @community = community
      @visit = visit
      @whodunnit = whodunnit
      @now = now || Rules.now(community)
    end

    def call!(attrs)
      attrs = attrs.to_h.with_indifferent_access
      return @visit if @visit.left.present?

      reason = attrs[:reason].presence || 'completed'
      raise TourApi::ApiError.validation([{ loc: %w[body reason], message: "Input should be one of #{REASONS.join(', ')}" }]) unless REASONS.include?(reason)

      ended_at = Rules.instant(attrs[:ended_at], @now, loc: %w[body ended_at])
      ended_at = @visit.arrived if @visit.arrived && ended_at < @visit.arrived
      abandoned_at = abandoned_stop(attrs[:abandoned_at_stop])

      ApplicationRecord.transaction do
        @visit.community = @community
        @visit.update!(left: ended_at, tour_state: reason, ended_reason: reason, abandoned_tour_at_stop: abandoned_at, active_app: false)
        booking = @visit.schedual_tour_id && @community.schedual_tours.find_by(id: @visit.schedual_tour_id)
        booking.update_columns(is_tour_completed: true, tour_completed_at: ended_at) if booking && reason == 'completed' && !booking.is_tour_completed
      end
      TourApi::Audit.record(@community, 'visit_ended', whodunnit: @whodunnit, payload: { visit_id: @visit.id, tour_user_id: @visit.tour_user_id, reason: reason, booking_id: @visit.schedual_tour_id })
      @visit.reload
    end

    private

      def abandoned_stop(raw)
        return nil if raw.nil? || raw == ''

        match = Record::STOP_ID.match(raw.to_s)
        stop = match && TourStop.find_by(tour_id: @visit.tour_id, stop_type: match[1], stop_id: match[2].to_i)
        raise TourApi::ApiError.unprocessable('invalid_stop', 'This stop is not on the tour.', { invalid_stops: [raw.to_s] }) unless stop

        stop.id
      end
  end
end
