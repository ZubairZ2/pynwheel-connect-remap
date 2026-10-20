# frozen_string_literal: true

module Locks
  # The read model of the Tour Setup "Locks" tab: the property's lock
  # providers, every imported device across vendors with what it is mapped
  # to, the manual keypad codes, the stops whose lock holder names a provider
  # but has no device or code, the targets a lock can be mapped to, and the
  # recent guest accesses the vendors issued. Everything comes from the
  # existing rows; nothing is written.
  #
  # No vendor stores battery, online or last-sync data; the only device-state
  # column is `zerv_locks.is_device_active`, so health is reported for Zerv
  # and "not reported" elsewhere. "Last changed" is the row's `updated_at`.
  class Inventory
    ISSUED_LIMIT = 100

    def initialize(community, include_codes: false, base_url: nil)
      @community = community
      @include_codes = include_codes
      @base_url = base_url
    end

    def as_json(*)
      {
        enabled: community.enable_locks != false,
        active_providers: Array(community.multiple_locks_provider),
        providers: providers,
        launch_only: launch_only,
        locks: locks,
        manual_codes: manual_codes,
        locked_without_lock: locked_without_lock,
        targets: targets,
        counts: counts,
        issued: issued
      }
    end

    def providers
      Vendors::KEYS.map do |vendor|
        account = Vendors.account(community, vendor)
        rows = device_rows[vendor]
        state = Vendors.account_state(vendor, account)
        {
          vendor: vendor,
          label: Vendors.label(vendor),
          enabled: Array(community.multiple_locks_provider).include?(vendor),
          configured: state[:configured],
          status: state[:status],
          mode: state[:mode],
          account: account_summary(vendor, account),
          details: Accounts.describe(vendor, account, base_url: @base_url),
          options: Accounts.options(vendor),
          access: access_of(vendor, state),
          lock_count: rows.size,
          mapped_count: rows.count { |row| row.stop_id.present? },
          last_changed_at: rows.map(&:updated_at).compact.max,
          supports: supports(vendor, state),
          health_source: vendor == 'Zerv' ? 'device_active' : nil,
          instructions: account ? { unit: account.try(:lock_instruction_text).presence, amenity: account.try(:amenity_lock_instruction_text).presence } : nil
        }
      end
    end

    # Vendors the Launch onboarding API records (Api::V2::SecureLocksController)
    # and the legacy Locks page has no tab for: Schlage, Yale and the free-text
    # "other" locks. Shown as chips, never as an account form.
    def launch_only
      providers = Array(community.multiple_locks_provider)
      [
        { vendor: 'Schlage', label: 'Schlage', present: community.schlage.present? || providers.include?('Schlage') },
        { vendor: 'Yale', label: 'Yale', present: community.yale.present? || providers.include?('Yale') },
        { vendor: 'Other', label: 'Other vendors', present: community.other_locks.exists? || providers.include?('Other') }
      ]
    end

    # The four lists below are memoised: `as_json` and `counts` read each of
    # them, and every `Targets.describe` of a door loads its parent record.
    def locks
      @locks ||= Vendors::KEYS.flat_map do |vendor|
        device_rows[vendor].map do |row|
          holder = holder_record(row.stop_type, row.stop_id)
          {
            key: "#{vendor}:#{row.id}",
            vendor: vendor,
            vendor_label: Vendors.label(vendor),
            id: row.id,
            device_id: Vendors.device_id_of(vendor, row),
            name: Vendors.display_name(vendor, row),
            mapped: holder.present?,
            # The row names a stop that no longer exists (a deleted unit, a vendor import pruned elsewhere).
            stale: row.stop_id.present? && holder.nil?,
            target: Targets.describe(holder, tour_stop_ids: tour_stop_ids),
            health: health_of(vendor, row),
            updated_at: row.updated_at
          }
        end
      end
    end

    # Holders with lock_provider "Manual": the fixed keypad code every visitor sees.
    def manual_codes
      @manual_codes ||= holders.select { |record| record.lock_provider == Vendors::MANUAL }.map do |record|
        {
          target: Targets.describe(record, tour_stop_ids: tour_stop_ids),
          code_present: record.access_code.present?,
          code: include_codes ? record.access_code.presence : nil
        }
      end
    end

    # A lock holder that names a provider but has no device of that provider
    # (or a Manual holder with no code): the visitor cannot open the door.
    def locked_without_lock
      @locked_without_lock ||= holders.select { |record| missing_lock?(record) }.map do |record|
        {
          target: Targets.describe(record, tour_stop_ids: tour_stop_ids),
          provider: record.lock_provider,
          reason: record.lock_provider == Vendors::MANUAL ? 'no_code' : 'no_device'
        }
      end
    end

    # What a lock can be mapped to, with its current lock: the tour's stops
    # (their door when they have one), the elevators, the building entry
    # points, the access points and the tour's own start.
    def targets
      @targets ||= candidate_records.map do |record|
        holder = Targets.holder_of(record)
        {
          target: Targets.describe(record, tour_stop_ids: tour_stop_ids),
          holder: holder.equal?(record) ? nil : Targets.describe(holder, tour_stop_ids: tour_stop_ids),
          lock: lock_state_of(holder)
        }
      end
    end

    def counts
      all_locks = locks
      {
        all: all_locks.size + manual_codes.size,
        unmapped: all_locks.count { |lock| !lock[:mapped] },
        mapped: all_locks.count { |lock| lock[:mapped] } + manual_codes.size,
        manual: manual_codes.size,
        health: all_locks.count { |lock| lock[:health][:state] == 'inactive' },
        without_lock: locked_without_lock.size
      }
    end

    # The guest accesses the vendors issued for visitors of this property,
    # newest first. The code or key itself is never sent.
    def issued
      rows = []
      IgloohomeGuest.where(community_id: community.id).order(id: :desc).limit(ISSUED_LIMIT).each do |guest|
        rows << issued_row('Igloohome', guest, guest.guest_of_stop_type, guest.guest_of_stop_id, guest.guest_pin.present? || guest.guest_key.present? ? 'issued' : 'failed', nil)
      end
      LatchGuest.where(community_id: community.id).order(id: :desc).limit(ISSUED_LIMIT).each do |guest|
        window = guest.start_time && guest.end_time ? { from: Time.at(guest.start_time).utc, to: Time.at(guest.end_time).utc } : nil
        rows << issued_row('Latch', guest, guest.guest_of_stop_type, guest.guest_of_stop_id, guest.status.presence || (guest.latch_link.present? ? 'issued' : 'failed'), window)
      end
      ZervGuest.where(community_id: community.id).order(id: :desc).limit(ISSUED_LIMIT).each do |guest|
        rows << issued_row('Zerv', guest, guest.guest_of_stop_type, guest.guest_of_stop_id, guest.status.presence || 'issued', nil)
      end
      AsGuest.where(community_id: community.id).order(id: :desc).limit(ISSUED_LIMIT).each do |guest|
        rows << issued_row(guest.dwelo_guest ? 'Dwelo' : 'EdgeState', guest, nil, nil, guest.guest_id.present? || guest.edgestate_pin.present? ? 'issued' : 'failed', nil)
      end
      rows.sort_by { |row| -row[:issued_at].to_i }.first(ISSUED_LIMIT)
    end

    private

      attr_reader :community, :include_codes

      def issued_row(vendor, guest, stop_type, stop_id, status, window)
        visitor = guest.tour_user_id ? visitors[guest.tour_user_id] : nil
        stop = stop_type.present? && stop_id.present? ? holder_record(stop_type, stop_id) : nil
        {
          vendor: vendor,
          vendor_label: Vendors.label(vendor),
          visitor: visitor ? { id: visitor.id, name: visitor.name.presence || [visitor.first_name, visitor.last_name].compact_blank.join(' ').presence || visitor.email } : nil,
          target: Targets.describe(stop, tour_stop_ids: tour_stop_ids),
          status: status.to_s.downcase,
          window: window,
          issued_at: guest.created_at
        }
      end

      def visitors
        @visitors ||= begin
          ids = [IgloohomeGuest, LatchGuest, ZervGuest, AsGuest].flat_map { |klass| klass.where(community_id: community.id).order(id: :desc).limit(ISSUED_LIMIT).pluck(:tour_user_id) }.compact.uniq
          TourUser.where(id: ids).index_by(&:id)
        end
      end

      def device_rows
        @device_rows ||= Vendors::KEYS.each_with_object({}) do |vendor, out|
          rows = Vendors.rows(community, vendor)
          out[vendor] = rows ? rows.order(:id).to_a : []
        end
      end

      def tour
        return @tour if defined?(@tour)

        @tour = community.community_tour
      end

      def tour_stops
        @tour_stops ||= tour ? tour.tour_stops.order(:sort, :id).to_a : []
      end

      # [stop_type, stop_id] → tour_stop id, for the stops of the main tour.
      def tour_stop_ids
        @tour_stop_ids ||= tour_stops.each_with_object({}) { |stop, out| out[[stop.stop_type, stop.stop_id]] ||= stop.id }
      end

      def units
        @units ||= community.units.where(id: tour_stops.select { |s| s.stop_type == 'unit' }.map(&:stop_id)).includes(:door).to_a
      end

      def amenities
        @amenities ||= community.amenities.where(id: tour_stops.select { |s| s.stop_type == 'amenity' }.map(&:stop_id)).includes(:doors).to_a
      end

      def elevators
        @elevators ||= community.elevators.order(:id).to_a
      end

      def entry_points
        @entry_points ||= BuildingStartingPoint.where(community_id: community.id).order(:id).to_a
      end

      def access_points
        @access_points ||= community.access_points.order(:id).to_a
      end

      # Records that can carry a lock, in the order the map dialog lists them.
      def candidate_records
        @candidate_records ||= begin
          stop_records = tour_stops.filter_map do |stop|
            case stop.stop_type
            when 'unit' then units.find { |u| u.id == stop.stop_id }
            when 'amenity' then amenities.find { |a| a.id == stop.stop_id }
            end
          end
          (stop_records + elevators + entry_points + access_points + [tour].compact).uniq
        end
      end

      # Every record that holds a lock for the property: the candidates' holders,
      # any door or record a device row points at, and any record of the
      # property whose `lock_provider` is set (a unit the legacy grid locked
      # before it became a stop still carries its code).
      def holders
        @holders ||= begin
          set = candidate_records.map { |record| Targets.holder_of(record) }
          device_rows.each_value { |rows| rows.each { |row| set << holder_record(row.stop_type, row.stop_id) } }
          set.concat(community.units.where.not(lock_provider: [nil, '']).to_a)
          set.concat(community.amenities.where.not(lock_provider: [nil, '']).to_a)
          set.concat(community.doors.where.not(lock_provider: [nil, '']).includes(:attached_with).to_a)
          set.concat(elevators.select { |e| e.lock_provider.present? })
          set.concat(entry_points.select { |p| p.lock_provider.present? })
          set << tour if tour&.lock_provider.present?
          set.compact.uniq
        end
      end

      public

      # The lock on a record's holder (the Stops rows read it through the same
      # loaded rows, so the two tabs never disagree).
      def lock_state_for(record)
        lock_state_of(Targets.holder_of(record))
      end

      def holder_description(record)
        holder = Targets.holder_of(record)
        holder.equal?(record) ? nil : Targets.describe(holder, tour_stop_ids: tour_stop_ids)
      end

      private

      def holder_record(stop_type, stop_id)
        return nil if stop_type.blank? || stop_id.blank?

        @holder_cache ||= {}
        key = [stop_type.to_s, stop_id.to_i]
        return @holder_cache[key] if @holder_cache.key?(key)

        @holder_cache[key] = case stop_type.to_s
                             when 'Unit' then community.units.find_by(id: stop_id)
                             when 'Amenity' then community.amenities.find_by(id: stop_id)
                             when 'Door' then community.doors.includes(:attached_with).find_by(id: stop_id)
                             when 'Elevator' then community.elevators.find_by(id: stop_id)
                             when 'BuildingStartingPoint' then BuildingStartingPoint.find_by(id: stop_id, community_id: community.id)
                             when 'Tour' then tour && tour.id == stop_id.to_i ? tour : nil
                             end
      end

      # The device rows pointing at a holder, across vendors.
      def devices_at(holder)
        @devices_at ||= Hash.new { |hash, key| hash[key] = [] }.tap do |index|
          device_rows.each { |vendor, rows| rows.each { |row| index[[row.stop_type.to_s, row.stop_id.to_i]] << [vendor, row] if row.stop_id.present? } }
        end
        @devices_at[[holder.class.base_class.name, holder.id]]
      end

      def lock_state_of(holder)
        provider = holder.lock_provider.presence
        device = devices_at(holder).find { |vendor, _row| vendor == provider } || devices_at(holder).first
        {
          provider: provider,
          device: device ? { vendor: device[0], id: device[1].id, device_id: Vendors.device_id_of(device[0], device[1]), name: Vendors.display_name(device[0], device[1]) } : nil,
          manual_code_present: provider == Vendors::MANUAL && holder.access_code.present?,
          manual_code: include_codes && provider == Vendors::MANUAL ? holder.access_code.presence : nil,
          missing: missing_lock?(holder)
        }
      end

      def missing_lock?(holder)
        provider = holder.lock_provider.presence
        return false if provider.nil?
        return holder.access_code.blank? if provider == Vendors::MANUAL

        devices_at(holder).none? { |vendor, _row| vendor == provider }
      end

      def health_of(vendor, row)
        return { state: 'not_reported', label: 'Not reported' } unless vendor == 'Zerv'

        case row.is_device_active
        when true then { state: 'active', label: 'Active' }
        when false then { state: 'inactive', label: 'Inactive' }
        else { state: 'not_reported', label: 'Not reported' }
        end
      end

      def account_summary(vendor, account)
        return nil if account.nil?

        case vendor
        when 'Igloohome' then { home_name: account.home_name.presence, authorized: account.is_authorized_with_pynwheel == true, client_id_present: account.client_id.present?, iglooworks_department_id: account.iglooworks_department_id.presence }
        when 'Latch' then { property_name: account.latch_property_name.presence, client_id_present: account.client_id.present? }
        when 'Zerv' then { facility_id: account.facility_id.presence, username_present: account.username.present? }
        when 'Dwelo' then { default_community_id: account.default_community_id.presence, client_id_present: account.client_id.present? }
        when 'EdgeState' then { client_id_present: account.client_id.present?, authorized: account.is_authorized_with_pynwheel == true }
        end
      end

      def supports(vendor, state)
        api = state[:configured] && !(vendor == 'Igloohome' && state[:mode] == 'v1')
        v1 = vendor == 'Igloohome' && state[:mode] == 'v1'
        {
          sync: api, test: api, purge: true, auto_match: true, csv: v1, async_sync: %w[Latch Zerv].include?(vendor),
          # The legacy page's account actions: every vendor has an account form
          # and visitor instructions; a single lock is typed only for v1; the
          # code-grant modes can forget their vendor token.
          account: true, instructions: true, add_device: v1,
          remove_authorization: (vendor == 'EdgeState' || (vendor == 'Igloohome' && state[:mode] == 'igloohome')) && state[:configured]
        }
      end

      # How a visitor opens this vendor's lock, and whether the new Tour App
      # does it (TourApi::Locks: igloohome door codes and v1 Bluetooth keys;
      # every other vendor is opened by the legacy app only).
      def access_of(vendor, state)
        case vendor
        when 'Igloohome'
          bluetooth = state[:mode] == 'v1'
          { method: bluetooth ? 'bluetooth_key' : 'hourly_pin', tour_app: true, legacy_app: true }
        when 'Latch' then { method: 'latch_key', tour_app: false, legacy_app: true }
        when 'Zerv' then { method: 'mobile_key', tour_app: false, legacy_app: true }
        when 'Dwelo' then { method: 'remote_unlock', tour_app: false, legacy_app: true }
        when 'EdgeState' then { method: 'keypad_pin', tour_app: false, legacy_app: true }
        end
      end
  end
end
