# frozen_string_literal: true

module TourApi
  # Smart locks on the tour's stops, as the legacy Pynwheel Tour app had
  # them (Api::SelfTour::V1 `start_tour` and `igloohome_accounts#get_pin_code`,
  # October 2026 port for the Capacitor app):
  #
  # * `describe` says which lock a unit or amenity carries. The lock sits on
  #   the record's door when the door holds the provider, else on the record
  #   itself — the rule `MapLocksJob#auto_map_locks` writes and
  #   `AllowedTourStopsHelper#igloohome_allowed_stops` reads.
  # * `pin!` issues an igloohome door code for one stop through the vendor
  #   services the CMS and the legacy app already use (`IgloohomeLockService`
  #   for an igloohome API account, `IgloohomeIglooworksService` for
  #   Iglooworks), with the legacy request exactly: an hourly algoPIN from the
  #   top of the property's current hour for three hours, named after the
  #   lock's stop.
  #
  # * `bluetooth_key!` issues the igloohome v1 guest access for one stop the
  #   way the legacy tour start did (`IgloohomeService#assign_guest_bluetooth_key`):
  #   a Bluetooth guest key from Pynwheel's partner account, 90 minutes from
  #   now, plus the backup hourly PIN. The app opens the lock with the key
  #   through the native igloohome SDK (the Capacitor plugin, October 2026).
  #
  # The other vendors (Latch, Zerv, Dwelo, EdgeState, Manual) are reported as
  # present but not supported: this app has no SDK for them.
  module Locks
    PIN_MODES = %w[igloohome iglooworks].freeze
    PIN_HOURS = 3
    KEY_MINUTES = 90
    STOP_ID = /\A(unit|amenity):(\d+)\z/

    # The property's igloohome account and its lock rows, read once for a stops list.
    Index = Struct.new(:community, :account, :locks)

    module_function

    def index(community)
      account = community.igloohome
      locks = account ? IgloohomeLock.where(igloohome_id: account.id).index_by { |lock| [lock.stop_type, lock.stop_id] } : {}
      Index.new(community, account, locks)
    end

    # The lock-bearing record of a stop: its door when the door carries the
    # provider, else the unit or amenity itself.
    def target_of(record)
      door = if record.is_a?(Unit)
               record.door
             elsif record.respond_to?(:ordered_doors)
               record.ordered_doors.first
             end
      door && door.lock_provider.present? ? door : record
    end

    # `nil` when the stop has no lock; else the provider, the igloohome mode
    # (`v1` / `igloohome` / `iglooworks`), how it opens (`pin` / `bluetooth`),
    # the mapped device and whether this API can issue a code for it.
    def describe(index, record)
      target = target_of(record)
      provider = Text.presence(target.lock_provider)
      return nil unless provider

      igloo = provider == 'Igloohome'
      mode = igloo ? Text.presence(index.account&.version) : nil
      lock = igloo && index.account ? index.locks[[target.class.name, target.id]] : nil
      method = if igloo
                 mode == 'v1' ? 'bluetooth' : 'pin'
               elsif %w[Latch Zerv].include?(provider)
                 'bluetooth'
               end
      device_id = Text.presence(lock&.device_id)
      # The property's active vendors (`communities.multiple_locks_provider`,
      # the Locks tab's "enabled" switch per provider) gate the issuance the
      # way the legacy tour start did: a mapped device of a vendor the staff
      # turned off is reported, never opened.
      vendor_on = Array(index.community.multiple_locks_provider).include?('Igloohome')
      {
        provider: provider,
        mode: mode,
        method: method,
        device_id: device_id,
        supported: igloo && vendor_on && (PIN_MODES.include?(mode) || mode == 'v1') && device_id.present? && index.community.enable_locks ? true : false
      }
    end

    def pin!(community, built, stop_id)
      record = stop_record!(community, built, stop_id)
      lock = describe(index(community), record)
      raise ApiError.unprocessable('no_lock', 'This stop has no smart lock.') unless lock
      raise ApiError.unprocessable('locks_disabled', 'Smart locks are turned off for this property.') unless community.enable_locks
      raise ApiError.unprocessable('lock_unsupported', VENDOR_OFF) if lock[:provider] == 'Igloohome' && !vendor_on?(community)
      raise ApiError.unprocessable('lock_unsupported', unsupported_message(lock)) unless lock[:supported]
      raise ApiError.unprocessable('lock_unsupported', 'This lock opens over Bluetooth, not with a door code.') unless lock[:method] == 'pin'

      target = target_of(record)
      now = Time.now.in_time_zone(community.get_time_zone)
      valid_from = now.strftime('%Y-%m-%dT%H:00:00%:z')
      valid_until = (now + PIN_HOURS.hours).strftime('%Y-%m-%dT%H:00:00%:z')
      access_name = access_name_of(target, lock[:mode])
      pin = issue(community, lock, now, access_name, valid_from, valid_until, stop_id)
      record_issue!(community, record, target, guest_pin: pin)
      {
        success: true,
        stop_id: stop_id,
        provider: lock[:provider],
        mode: lock[:mode],
        device_id: lock[:device_id],
        access_name: access_name,
        pin: pin,
        valid_from: valid_from,
        valid_until: valid_until
      }
    end

    # The igloohome v1 guest access for one stop: the Bluetooth guest key and
    # the backup PIN from the partner API, exactly as the legacy tour start
    # asked for them. The key travels to the phone once and is never logged.
    def bluetooth_key!(community, built, stop_id)
      record = stop_record!(community, built, stop_id)
      idx = index(community)
      lock = describe(idx, record)
      raise ApiError.unprocessable('no_lock', 'This stop has no smart lock.') unless lock
      raise ApiError.unprocessable('locks_disabled', 'Smart locks are turned off for this property.') unless community.enable_locks
      raise ApiError.unprocessable('lock_unsupported', VENDOR_OFF) if lock[:provider] == 'Igloohome' && !vendor_on?(community)
      raise ApiError.unprocessable('lock_unsupported', unsupported_message(lock)) unless lock[:supported]
      raise ApiError.unprocessable('lock_unsupported', 'This lock opens with a door code, not over Bluetooth.') unless lock[:method] == 'bluetooth' && lock[:provider] == 'Igloohome'

      target = target_of(record)
      row = idx.locks[[target.class.name, target.id]]
      now = Time.now.in_time_zone(community.get_time_zone)
      access = begin
        IgloohomeService.new(community, now, nil).guest_access_for(row)
      rescue StandardError => e
        Rails.logger.warn("[tour-api] lock key failed property=#{community.id} stop=#{stop_id} #{e.class}")
        raise ApiError.new(502, 'lock_unavailable', 'The lock service could not be reached. Please try again.')
      end
      unless access[:bluetooth_key]
        Rails.logger.warn("[tour-api] lock key refused property=#{community.id} stop=#{stop_id} status=#{access[:status]}")
        raise ApiError.new(502, 'lock_unavailable', 'The lock service did not issue a Bluetooth key. Please try again.')
      end
      record_issue!(community, record, target, guest_pin: access[:guest_pin], guest_bluetooth_key: access[:bluetooth_key], guest_key: access[:key_id])

      {
        success: true,
        stop_id: stop_id,
        provider: 'Igloohome',
        mode: 'v1',
        device_id: lock[:device_id],
        lock_name: lock[:device_id],
        bluetooth_key: access[:bluetooth_key],
        key_id: access[:key_id],
        guest_pin: access[:guest_pin],
        valid_from: access[:valid_from].strftime('%Y-%m-%dT%H:%M:%S%:z'),
        valid_until: access[:valid_until].strftime('%Y-%m-%dT%H:%M:%S%:z')
      }
    end

    # The stop must be on the property's stops list (the same membership the
    # routes use) and be one of this property's records.
    def stop_record!(community, built, stop_id)
      invalid = ApiError.unprocessable('invalid_stop', 'This stop is not on the tour.', { invalid_stops: [stop_id] })
      match = STOP_ID.match(stop_id.to_s)
      raise invalid unless match && Stops.selectable_ids(community, built).include?(stop_id)

      model = match[1] == 'unit' ? Unit : Amenity
      model.find_by(id: match[2].to_i, community_id: community.id) || raise(invalid)
    end

    VENDOR_OFF = 'This property\'s igloohome locks are switched off.'

    # `communities.multiple_locks_provider` lists the vendors staff turned on.
    def vendor_on?(community)
      Array(community.multiple_locks_provider).include?('Igloohome')
    end

    # The audit row the legacy tour start wrote per issuance (`igloohome_guests`,
    # what the Locks tab lists as "issued codes"). The app's visitor is a CMS
    # user, not a TourUser, so `tour_user_id` stays nil; a failure to write
    # the row never fails the issuance.
    def record_issue!(community, record, target, guest_pin: nil, guest_bluetooth_key: nil, guest_key: nil)
      IgloohomeGuest.create!(
        community_id: community.id, tour_user_id: nil, guest_pin: guest_pin, guest_bluetooth_key: guest_bluetooth_key, guest_key: guest_key,
        stop_id: target.id, stop_type: target.class.name, guest_of_stop_type: record.class.name, guest_of_stop_id: record.id
      )
    rescue StandardError => e
      Rails.logger.warn("[tour-api] lock audit row not written property=#{community.id} #{e.class}: #{e.message[0, 120]}")
    end

    def unsupported_message(lock)
      if lock[:provider] == 'Igloohome' && lock[:device_id].nil?
        'This stop has no igloohome lock assigned to it yet.'
      elsif lock[:provider] == 'Igloohome'
        'This property\'s igloohome account is not set up for door codes.'
      else
        "This #{lock[:provider]} lock cannot be opened from this app yet. Ask the leasing office for access."
      end
    end

    # The legacy name of the access: the lock's stop (`Unit#name` is the
    # marketing name, a door its own name); Iglooworks rejects punctuation.
    def access_name_of(target, mode)
      name = target.respond_to?(:name) ? target.name.to_s : ''
      name = "#{target.class.name} #{target.id}" if name.blank?
      mode == 'iglooworks' ? name.gsub(/[^a-zA-Z0-9 ]/, '') : name
    end

    def issue(community, lock, now, access_name, valid_from, valid_until, stop_id)
      response = case lock[:mode]
                 when 'igloohome' then igloohome_pin(community, lock, now, access_name, valid_from, valid_until)
                 when 'iglooworks' then IgloohomeIglooworksService.new(community.id, now).generate_hourly_pin(lock[:device_id], access_name, valid_from, valid_until)
                 end
      pin = pin_of(response)
      return pin if pin

      Rails.logger.warn("[tour-api] lock pin refused property=#{community.id} stop=#{stop_id} mode=#{lock[:mode]} status=#{status_of(response)}")
      raise ApiError.new(502, 'lock_unavailable', 'The lock service did not issue a door code. Please try again.')
    rescue ApiError
      raise
    rescue StandardError => e
      # The vendor could not be reached (DNS, timeout, TLS): the app shows the reason category, never the trace.
      Rails.logger.warn("[tour-api] lock pin failed property=#{community.id} stop=#{stop_id} mode=#{lock[:mode]} #{e.class}")
      raise ApiError.new(502, 'lock_unavailable', 'The lock service could not be reached. Please try again.')
    end

    # The igloohome API account's hourly PIN. The service renews its token
    # itself, except in one legacy corner: once a token has been stored,
    # `is_authorized_with_pynwheel` is set and `is_client_auth` turns false,
    # so an account on client credentials never renews again (the CMS only
    # clears the flag when staff re-save the credentials). A 401 on such an
    # account is therefore answered the way the CMS would: one fresh
    # client-credentials token, stored as the service stores it, one retry.
    def igloohome_pin(community, lock, now, access_name, valid_from, valid_until)
      service = IgloohomeLockService.new(community.id, now)
      response = service.generate_hourly_pin(lock[:device_id], access_name, valid_from, valid_until)
      account = community.igloohome
      return response unless status_of(response) == 401 && account&.client_id.present? && account.client_secret.present?

      token = service.client_credentials
      value = token.respond_to?(:parsed_response) && token.parsed_response.is_a?(Hash) ? Text.presence(token.parsed_response['access_token'].to_s) : nil
      return response unless value

      account.update_columns(access_token: value, access_token_expiry: 1.day.from_now, is_authorized_with_pynwheel: true)
      IgloohomeLockService.new(community.id, now).generate_hourly_pin(lock[:device_id], access_name, valid_from, valid_until)
    end

    def pin_of(response)
      return nil unless response.respond_to?(:code) && status_of(response) == 200

      parsed = response.respond_to?(:parsed_response) ? response.parsed_response : nil
      parsed.is_a?(Hash) ? Text.presence(parsed['pin'].to_s) : nil
    end

    def status_of(response)
      response.respond_to?(:code) ? response.code.to_i : nil
    end
  end
end
