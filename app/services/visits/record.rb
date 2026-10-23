# frozen_string_literal: true

module Visits
  # The events the Tour App reports during a visit, written to the legacy
  # tables (October 23, 2026): a stop event (`arrived`, `skipped`, `photo`,
  # `note`, `issue`) is a `visited_stops` row keyed by the visit's `tour_key`
  # as the legacy `save_tour_history` wrote it (date and time-of-day in the
  # property's clock, the code the app showed as `stop_pin`), plus the new
  # `kind`, `occurred_at` and `tour_history_id`; a door event (`unlocked`,
  # `unlock_failed`) is a `lock_histories` row; `heartbeat` only keeps the
  # visit active. Each event is its own savepoint, so one bad item never
  # loses the batch; a repeated `client_event_id` is acknowledged as a
  # duplicate, not written twice (a unique index guards the race).
  class Record
    MAX_EVENTS = 100
    KINDS = %w[arrived skipped photo note issue unlocked unlock_failed heartbeat].freeze
    STOP_KINDS = %w[arrived skipped photo note issue].freeze
    LOCK_KINDS = %w[unlocked unlock_failed].freeze
    STOP_ID = /\A(unit|amenity|elevator):(\d+)\z/
    UUID = /\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i
    MAX_TEXT = 2000
    MAX_IMAGE_BYTES = 5 * 1024 * 1024

    Item = Struct.new(:index, :client_event_id, :kind, :stop, :occurred_at, :payload, keyword_init: true)

    def self.call!(community, visit, events, whodunnit:, device_id: nil, now: nil)
      new(community, visit, whodunnit: whodunnit, device_id: device_id, now: now).call!(events)
    end

    def initialize(community, visit, whodunnit:, device_id: nil, now: nil)
      @community = community
      @visit = visit
      @whodunnit = whodunnit
      @device_id = device_id.to_s[0, 64].presence
      @now = now || Rules.now(community)
      @zone = Rules.zone(community)
    end

    def call!(events)
      raise TourApi::ApiError.validation([{ loc: %w[body events], message: 'Field required' }]) if events.nil?
      raise TourApi::ApiError.validation([{ loc: %w[body events], message: 'Input should be a valid list' }]) unless events.is_a?(Array)
      raise TourApi::ApiError.validation([{ loc: %w[body events], message: "List should have at least 1 item after validation, not #{events.size}" }]) if events.empty?
      raise TourApi::ApiError.validation([{ loc: %w[body events], message: "List should have at most #{MAX_EVENTS} items after validation, not #{events.size}" }]) if events.size > MAX_EVENTS
      raise TourApi::ApiError.unprocessable('visit_ended', 'This visit has ended.') if @visit.left.present?

      accepted = []
      rejected = []
      events.each_with_index do |raw, index|
        item = parse(raw, index)
        accepted << write(item)
      rescue TourApi::ApiError => e
        rejected << { index: index, client_event_id: client_id_of(raw), code: e.code, message: e.message }
      end
      @visit.update_columns(active_app: true, updated_at: @now) if accepted.any?
      { accepted: accepted, rejected: rejected }
    end

    private

      def client_id_of(raw)
        raw.is_a?(Hash) ? (raw['client_event_id'] || raw[:client_event_id]).to_s.presence : nil
      end

      def parse(raw, index)
        raise TourApi::ApiError.validation([{ loc: ['body', 'events', index], message: 'Input should be a valid dictionary' }]) unless raw.is_a?(Hash)

        raw = raw.to_h.with_indifferent_access
        kind = raw[:kind].to_s
        raise TourApi::ApiError.validation([{ loc: ['body', 'events', index, 'kind'], message: "Input should be one of #{KINDS.join(', ')}" }]) unless KINDS.include?(kind)

        client_event_id = raw[:client_event_id].presence
        if client_event_id && !client_event_id.to_s.match?(UUID)
          raise TourApi::ApiError.validation([{ loc: ['body', 'events', index, 'client_event_id'], message: 'Input should be a UUID' }])
        end

        stop = nil
        if STOP_KINDS.include?(kind) || LOCK_KINDS.include?(kind)
          stop = stop!(raw[:stop_id], index)
        end
        payload = raw[:payload].is_a?(Hash) ? raw[:payload].to_h.with_indifferent_access : {}
        Item.new(index: index, client_event_id: client_event_id&.to_s&.downcase, kind: kind, stop: stop,
                 occurred_at: Rules.instant(raw[:occurred_at], @now, loc: ['body', 'events', index, 'occurred_at']), payload: payload)
      end

      # The tour stop row of `unit:N` / `amenity:N` / `elevator:N` on this visit's tour.
      def stop!(raw, index)
        match = STOP_ID.match(raw.to_s)
        stop = match && TourStop.find_by(tour_id: @visit.tour_id, stop_type: match[1], stop_id: match[2].to_i)
        raise TourApi::ApiError.unprocessable('invalid_stop', 'This stop is not on the tour.', { invalid_stops: [raw.to_s], index: index }) unless stop

        stop
      end

      def write(item)
        duplicate = item.client_event_id && existing(item)
        return { index: item.index, client_event_id: item.client_event_id, kind: item.kind, id: duplicate.id, duplicate: true } if duplicate

        row = ApplicationRecord.transaction(requires_new: true) do
          case item.kind
          when 'heartbeat' then nil
          when *LOCK_KINDS then lock_row!(item)
          else stop_row!(item)
          end
        end
        TourApi::Audit.record(@community, 'visit_issue', whodunnit: @whodunnit, payload: { visit_id: @visit.id, stop: item.stop&.name, category: text(item.payload[:category], 64) }) if item.kind == 'issue'
        { index: item.index, client_event_id: item.client_event_id, kind: item.kind, id: row&.id, duplicate: false }
      rescue ActiveRecord::RecordNotUnique
        duplicate = existing(item)
        { index: item.index, client_event_id: item.client_event_id, kind: item.kind, id: duplicate&.id, duplicate: true }
      end

      def existing(item)
        if LOCK_KINDS.include?(item.kind)
          LockHistory.find_by(tour_history_id: @visit.id, client_event_id: item.client_event_id)
        else
          VisitedStop.find_by(tour_history_id: @visit.id, client_event_id: item.client_event_id)
        end
      end

      def stop_row!(item)
        local = item.occurred_at.in_time_zone(@zone)
        row = VisitedStop.new(
          tour_user_id: @visit.tour_user_id, tour_id: @visit.tour_id, tour_stop_id: item.stop.id, tour_key: @visit.tour_key, device_id: @device_id,
          stop_type: item.stop.stop_type, event_date: local.to_date, event_time: local.strftime('%H:%M:%S'), is_rotated: false,
          kind: item.kind, occurred_at: item.occurred_at, tour_history_id: @visit.id, client_event_id: item.client_event_id,
          stop_pin: item.kind == 'arrived' ? text(item.payload[:code], 64) : nil,
          description: %w[note issue].include?(item.kind) ? text(item.payload[:text], MAX_TEXT) : nil,
          payload: stored_payload(item)
        )
        attach_photo!(row, item) if item.kind == 'photo'
        row.save!
        row
      end

      def lock_row!(item)
        LockHistory.create!(
          tour_user_id: @visit.tour_user_id, tour_history_id: @visit.id, event: item.kind, occured_at: item.occurred_at,
          stop_id: item.stop.stop_id, stop_type: item.stop.stop_type, stop_name: item.stop.name,
          provider: text(item.payload[:provider], 32), method: text(item.payload[:method], 16), success: item.kind == 'unlocked',
          error_code: item.kind == 'unlock_failed' ? text(item.payload[:error_code], 64) : nil, client_event_id: item.client_event_id
        )
      end

      # What is kept of the payload: short labelled strings, never a code or an image.
      def stored_payload(item)
        kept = {}
        kept['caption'] = text(item.payload[:caption], 280) if item.payload[:caption].present?
        kept['category'] = text(item.payload[:category], 64) if item.payload[:category].present?
        kept['reason'] = text(item.payload[:reason], 64) if item.payload[:reason].present?
        kept['provider'] = text(item.payload[:provider], 32) if item.payload[:provider].present?
        kept['method'] = text(item.payload[:method], 16) if item.payload[:method].present?
        kept
      end

      def attach_photo!(row, item)
        data = item.payload[:image].to_s
        raise TourApi::ApiError.validation([{ loc: ['body', 'events', item.index, 'payload', 'image'], message: 'Field required' }]) if data.blank?
        raise TourApi::ApiError.validation([{ loc: ['body', 'events', item.index, 'payload', 'image'], message: 'Input should be a data URL image' }]) unless data.start_with?('data:image/')
        raise TourApi::ApiError.validation([{ loc: ['body', 'events', item.index, 'payload', 'image'], message: 'Image is larger than 5 MB' }]) if data.bytesize > MAX_IMAGE_BYTES * 4 / 3

        row.image = Carrierwave::Base64::Base64StringIO.new(data, "visit-#{@visit.id}-#{item.stop.id}")
      end

      def text(value, max)
        value.to_s.strip[0, max].presence
      end
  end
end
