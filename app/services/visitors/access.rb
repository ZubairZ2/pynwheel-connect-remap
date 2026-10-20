# frozen_string_literal: true

module Visitors
  # The guest accesses the lock vendors issued to one visitor at one
  # property, as the legacy integrations recorded them: `igloohome_guests`
  # (hourly PIN / Bluetooth key), `latch_guests` (one row per door, with the
  # reservation window), `zerv_guests` (the Pynwheel Access mobile key, with
  # the vendor's errors), `as_guests` (RemoteLock / Dwelo guest, EdgeState
  # keypad PIN) and `igloo_guests` (the older Igloo keypad code). Nothing is
  # issued or renewed here; the rows are read and described.
  #
  # Statuses are the stored facts: `active` / `expired` from a Latch window,
  # the vendor's own `status` where it keeps one, `issued` when a credential
  # was written, `failed` when the vendor answered without one (or Zerv
  # recorded errors). An igloohome or RemoteLock row has no stored validity
  # window; the design's window column shows "not recorded" for those rather
  # than a window computed from today's settings.
  #
  # The code itself (`code`) is only present when the caller may see it
  # (`include_codes`, Connect: User#can_edit_map?); every row says whether
  # one exists (`code_present`). Latch and Zerv never store a code: the key
  # lives in the visitor's app.
  class Access
    LIMIT = 300
    METHOD = {
      'Igloohome' => ['hourly_pin', 'Hourly PIN'],
      'Latch' => ['latch_key', 'Latch key'],
      'Zerv' => ['mobile_key', 'Mobile key'],
      'Dwelo' => ['remote_unlock', 'Remote unlock'],
      'EdgeState' => ['keypad_pin', 'Keypad PIN'],
      'Igloo' => ['keypad_pin', 'Keypad code']
    }.freeze
    FAILED_STATES = %w[failed error].freeze

    def initialize(community, tour_user, now: Time.current, include_codes: false)
      @community = community
      @tour_user = tour_user
      @now = now
      @include_codes = include_codes
    end

    # Newest first.
    def rows
      @rows ||= (igloohome + latch + zerv + remote_lock + igloo).sort_by { |row| [-row[:issued_at].to_i, row[:id]] }.first(LIMIT)
    end

    def any_failed?
      rows.any? { |row| row[:status] == 'failed' }
    end

    # The rows issued while a visit was recorded (`arrived` .. `left`, or the
    # app's active window when no end was posted), for the session panel.
    # A match by time, not a stored link: the guest tables carry no
    # tour_history reference.
    def during(history)
      return [] if history.arrived.blank?

      from = history.arrived - 30.minutes
      to = history.left || (history.arrived + Status::ACTIVE_WINDOW)
      rows.select { |row| row[:issued_at] && row[:issued_at] >= from && row[:issued_at] <= to }
    end

    # Which of `visitor_ids` have a failed issuance at the property (the
    # list's "Code failed" flag), in four queries.
    def self.failed_visitor_ids(community, visitor_ids)
      ids = Array(visitor_ids).compact
      return [] if ids.empty?

      failed = []
      failed += IgloohomeGuest.where(community_id: community.id, tour_user_id: ids).where("(guest_pin IS NULL OR guest_pin = '') AND (guest_key IS NULL OR guest_key = '') AND (guest_bluetooth_key IS NULL OR guest_bluetooth_key = '')").distinct.pluck(:tour_user_id)
      failed += ZervGuest.where(community_id: community.id, tour_user_id: ids).where("res_errors IS NOT NULL AND res_errors::text NOT IN ('null', '[]', '{}', '\"\"') OR lower(status) IN (?)", FAILED_STATES).distinct.pluck(:tour_user_id)
      failed += LatchGuest.where(community_id: community.id, tour_user_id: ids).where('lower(status) IN (?)', FAILED_STATES).distinct.pluck(:tour_user_id)
      failed += AsGuest.where(community_id: community.id, tour_user_id: ids).where("(guest_id IS NULL OR guest_id = '') AND (edgestate_pin IS NULL OR edgestate_pin = '')").distinct.pluck(:tour_user_id)
      failed.uniq
    end

    private

      attr_reader :community, :tour_user, :now, :include_codes

      def igloohome
        IgloohomeGuest.where(community_id: community.id, tour_user_id: tour_user.id).order(id: :desc).limit(LIMIT).map do |guest|
          credential = guest.guest_pin.presence || guest.guest_key.presence || guest.guest_bluetooth_key.presence
          method = guest.guest_bluetooth_key.present? && guest.guest_pin.blank? ? ['bluetooth_key', 'Bluetooth key'] : METHOD['Igloohome']
          row('Igloohome', guest, guest.guest_of_stop_type.presence || guest.stop_type, guest.guest_of_stop_id.presence || guest.stop_id,
              status: credential ? 'issued' : 'failed', method: method, code: guest.guest_pin.presence, window: nil)
        end
      end

      def latch
        LatchGuest.where(community_id: community.id, tour_user_id: tour_user.id).order(id: :desc).limit(LIMIT).map do |guest|
          window = guest.start_time && guest.end_time ? { from: Time.at(guest.start_time).utc, to: Time.at(guest.end_time).utc } : nil
          status = guest.status.to_s.downcase.presence || (guest.latch_link.present? ? 'issued' : 'failed')
          status = 'expired' if status == 'active' && window && window[:to] < now
          row('Latch', guest, guest.guest_of_stop_type, guest.guest_of_stop_id, status: status, method: METHOD['Latch'], code: nil, window: window,
                                                                                   detail: guest.latch_link.to_s.split(' | ').last.presence)
        end
      end

      def zerv
        ZervGuest.where(community_id: community.id, tour_user_id: tour_user.id).order(id: :desc).limit(LIMIT).map do |guest|
          errors = guest.res_errors.presence
          errors = nil if errors.is_a?(Array) && errors.empty?
          errors = nil if errors.is_a?(Hash) && errors.empty?
          status = errors ? 'failed' : (guest.status.to_s.downcase.presence || 'issued')
          row('Zerv', guest, guest.guest_of_stop_type, guest.guest_of_stop_id, status: status, method: METHOD['Zerv'], code: nil, window: nil,
                                                                                 reason: errors && errors.to_s.truncate(160))
        end
      end

      def remote_lock
        AsGuest.where(community_id: community.id, tour_user_id: tour_user.id).order(id: :desc).limit(LIMIT).map do |guest|
          vendor = guest.dwelo_guest ? 'Dwelo' : 'EdgeState'
          credential = guest.guest_id.presence || guest.edgestate_pin.presence
          row(vendor, guest, nil, nil, status: credential ? 'issued' : 'failed', method: METHOD[vendor], code: guest.edgestate_pin.presence, window: nil)
        end
      end

      def igloo
        IglooGuest.where(community_id: community.id, tour_user_id: tour_user.id).order(id: :desc).limit(LIMIT).map do |guest|
          row('Igloo', guest, nil, nil, status: guest.status.to_s.downcase.presence || (guest.guest_code.present? ? 'issued' : 'failed'),
                                        method: METHOD['Igloo'], code: guest.guest_code.presence, window: nil, detail: guest.stop_id && "Lock #{guest.stop_id}")
        end
      end

      def row(vendor, guest, stop_type, stop_id, status:, method:, code:, window:, reason: nil, detail: nil)
        record = record_for(stop_type, stop_id)
        target = Locks::Targets.describe(record)
        {
          id: "#{vendor.downcase}-#{guest.id}",
          vendor: vendor,
          vendor_label: Locks::Vendors.label(vendor),
          method: method[0],
          method_label: method[1],
          target: target,
          target_name: target && target[:name].presence || detail,
          status: status,
          reason: reason,
          window: window,
          issued_at: guest.created_at,
          code_present: code.present?,
          code: include_codes ? code : nil
        }
      end

      def record_for(stop_type, stop_id)
        return nil if stop_type.blank? || stop_id.blank?

        @records ||= {}
        key = [stop_type.to_s.classify, stop_id.to_i]
        return @records[key] if @records.key?(key)

        @records[key] = case key[0]
                        when 'Unit' then community.units.find_by(id: key[1])
                        when 'Amenity' then community.amenities.find_by(id: key[1])
                        when 'Door' then community.doors.find_by(id: key[1])
                        when 'Elevator' then community.elevators.find_by(id: key[1])
                        when 'BuildingStartingPoint' then BuildingStartingPoint.find_by(id: key[1], community_id: community.id)
                        end
      rescue StandardError
        @records[key] = nil
      end
  end
end
