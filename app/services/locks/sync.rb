# frozen_string_literal: true

module Locks
  # "Sync locks" and "Test connection" for one vendor, through the services
  # and jobs the legacy Locks page buttons call:
  #   EdgeState  RemoteLockService#get_all_deivces → #update_deivces_in_db
  #   Dwelo      DweloDevicesHelper#dwelo_client_credentials → #update_deivces_in_db
  #   Igloohome  igloohome: IgloohomeLockService#get_properties / #get_property_devices, upsert by deviceId
  #              iglooworks: IgloohomeIglooworksService#get_locks, upsert by lockId
  #              v1: no API (devices come from the CSV or the single-lock form)
  #   Latch      LatchOpenkit::LatchLocksService#test_connection, then ImportLatchLocksWorker (Sidekiq)
  #   Zerv       ZervServices::ImportLockService (test_connection true / false; the import is a job)
  # A vendor that cannot be reached answers 502 `vendor_unreachable`; the
  # response text of the vendor is never passed on.
  class Sync
    include DweloDevicesHelper

    Outcome = Struct.new(:status, :count, :message, keyword_init: true)

    def initialize(community)
      @community = community
    end

    def self.sync!(community, vendor:)
      new(community).sync!(vendor)
    end

    def self.test(community, vendor:)
      new(community).test(vendor)
    end

    def sync!(vendor)
      vendor = vendor.to_s
      account = account!(vendor)
      case vendor
      when 'EdgeState'
        response = remotelock_devices(account)
        raise Connect::DomainError.upstream('vendor_unreachable', 'RemoteLock did not answer with devices. Check the credentials.') unless response.present? && response['data'].present?

        before = account.edgestate_locks.count
        RemoteLockService.new(@community).update_deivces_in_db(response)
        Outcome.new(status: 'imported', count: account.edgestate_locks.count, message: "#{account.edgestate_locks.count} locks on file (#{before} before).")
      when 'Dwelo'
        devices = dwelo_devices(account)
        before = account.dwelo_locks.count
        update_deivces_in_db(devices, account)
        Outcome.new(status: 'imported', count: account.dwelo_locks.count, message: "#{account.dwelo_locks.count} locks on file (#{before} before).")
      when 'Igloohome'
        devices = igloohome_devices(account)
        upsert_igloohome!(account, devices)
        Outcome.new(status: 'imported', count: account.igloohome_locks.count, message: "#{devices.size} devices received; #{account.igloohome_locks.count} locks on file.")
      when 'Latch'
        response = latch_test(account)
        raise Connect::DomainError.upstream('vendor_unreachable', response[:message].to_s.presence || 'Latch refused the credentials.') unless response.is_a?(Hash) && response[:status] == :OK

        ImportLatchLocksWorker.perform_async(@community.id)
        Outcome.new(status: 'queued', count: account.latch_locks.count, message: 'The Latch import has started; the locks appear once it finishes.')
      when 'Zerv'
        result = ZervServices::ImportLockService.call(community: @community, test_connection: false)
        raise Connect::DomainError.upstream('vendor_unreachable', 'Zerv could not be reached.') if result.nil?
        raise Connect::DomainError.upstream('vendor_unreachable', 'Zerv refused the credentials.') unless result.success?

        Outcome.new(status: 'queued', count: account.zerv_locks.count, message: 'Zerv accepted the request; the locks appear once the import finishes.')
      else
        raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.')
      end
    rescue Connect::DomainError
      raise
    rescue StandardError => e
      Rails.logger.warn("[Locks::Sync] #{vendor} sync failed for community #{@community.id}: #{e.class}: #{e.message}")
      raise Connect::DomainError.upstream('vendor_unreachable', "#{Vendors.label(vendor)} could not be reached.")
    end

    def test(vendor)
      vendor = vendor.to_s
      account = account!(vendor)
      case vendor
      when 'EdgeState'
        response = remotelock_devices(account)
        ok = response.present? && response['data'].present?
        Outcome.new(status: ok ? 'ok' : 'failed', count: ok ? Array(response['data']).size : 0, message: ok ? "RemoteLock answered with #{Array(response['data']).size} devices." : 'RemoteLock did not answer with devices.')
      when 'Dwelo'
        devices = Array(dwelo_devices(account)['data'])
        Outcome.new(status: 'ok', count: devices.size, message: "Dwelo answered with #{devices.size} devices.")
      when 'Igloohome'
        devices = igloohome_devices(account)
        Outcome.new(status: 'ok', count: devices.size, message: "#{Vendors.label(vendor)} answered with #{devices.size} devices.")
      when 'Latch'
        response = latch_test(account)
        ok = response.is_a?(Hash) && response[:status] == :OK
        Outcome.new(status: ok ? 'ok' : 'failed', count: nil, message: ok ? 'Latch accepted the credentials and found the building.' : response[:message].to_s.presence || 'Latch refused the credentials.')
      when 'Zerv'
        result = ZervServices::ImportLockService.call(community: @community, test_connection: true)
        ok = result.present? && result.success?
        Outcome.new(status: ok ? 'ok' : 'failed', count: nil, message: ok ? 'Zerv accepted the credentials.' : 'Zerv refused the credentials.')
      else
        raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.')
      end
    rescue Connect::DomainError
      raise
    rescue StandardError => e
      Rails.logger.warn("[Locks::Sync] #{vendor} test failed for community #{@community.id}: #{e.class}: #{e.message}")
      Outcome.new(status: 'failed', count: nil, message: "#{Vendors.label(vendor)} could not be reached.")
    end

    private

      def account!(vendor)
        raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.') unless Vendors.valid?(vendor)

        account = Vendors.account(@community, vendor)
        state = Vendors.account_state(vendor, account)
        raise Connect::DomainError.invalid('no_account', "Enter the #{Vendors.label(vendor)} credentials in the CMS first.") unless account && state[:configured]
        raise Connect::DomainError.invalid('no_api', 'A legacy v1 Igloohome account has no API; locks come from the CSV or the single-lock form.') if vendor == 'Igloohome' && state[:mode] == 'v1'

        account
      end

      # ApplicationController#generate_remotelock_token: client credentials when they are set, else the stored refresh token.
      def remotelock_devices(account)
        token = if account.client_id.present? && account.client_secret.present?
                  RemoteLockService.new(@community).client_credentials
                else
                  RemoteLockService.new(@community).get_access_token_after_refresh
                end
        RemoteLockService.new(@community).get_all_deivces(token)
      end

      # DwelosController#test_dwelo_connection: the device list of the Dwelo community.
      def dwelo_devices(account)
        dwelo_client_credentials(account)
        raise Connect::DomainError.upstream('vendor_unreachable', 'Dwelo refused the credentials.') if @token.blank?

        url = "#{base_url}/v4/integrations/pynwheel/devices/?community_id=#{account.default_community_id}&per_page=1000"
        response = HTTParty.get(url, headers: { 'Authorization' => "Bearer #{@token}", 'Accept' => 'application/vnd.lockstate+json; version=1' })
        parsed = response.respond_to?(:parsed_response) ? response.parsed_response : nil
        raise Connect::DomainError.upstream('vendor_unreachable', 'Dwelo did not answer with devices.') unless parsed.is_a?(Hash) && parsed['data'].is_a?(Array)

        parsed
      end

      # IgloohomeV2AccountsController / IgloohomeIglooworksAccountsController: the vendor's device list, as `[{id, name}]`.
      def igloohome_devices(account)
        if account.version == 'iglooworks'
          payload = IgloohomeIglooworksService.new(@community.id).get_locks['payload']
          raise Connect::DomainError.upstream('vendor_unreachable', 'Iglooworks did not answer with locks. Check the API key and department.') unless payload.is_a?(Array)

          payload.map { |lock| { id: lock['lockId'], name: lock['lockName'] } }
        else
          service = IgloohomeLockService.new(@community.id)
          properties = service.get_properties
          property = Array(properties.is_a?(Hash) ? properties['payload'] : nil).find { |row| row['name'] == account.home_name }
          raise Connect::DomainError.invalid('home_not_found', "No igloohome home named #{account.home_name.inspect} was found on the account.") unless property

          payload = service.get_property_devices(property['id'])['payload']
          raise Connect::DomainError.upstream('vendor_unreachable', 'igloohome did not answer with devices.') unless payload.is_a?(Array)

          payload.map { |device| { id: device['deviceId'], name: device['deviceName'] } }
        end
      end

      # The legacy `store_devices`: update a known device's name, create the rest.
      def upsert_igloohome!(account, devices)
        locks = account.igloohome_locks
        by_id = locks.index_by(&:device_id)
        ApplicationRecord.transaction do
          devices.each do |device|
            next if device[:id].blank?

            lock = by_id[device[:id]]
            lock ? lock.update(device_name: device[:name]) : locks.create(device_id: device[:id], device_name: device[:name])
          end
        end
      end

      def latch_test(_account)
        LatchOpenkit::LatchLocksService.new(nil, @community.id).test_connection
      end
  end
end
