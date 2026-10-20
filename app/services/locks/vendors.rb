# frozen_string_literal: true

module Locks
  # The smart-lock vendors the CMS imports devices from, as the legacy Locks
  # page (dwelos/_locks.html.haml) and AssignLocksHelper#all_locks know them:
  # the community's account record, the device rows, and which columns carry
  # the device's name and vendor id. `lock_provider` on a unit, amenity, door,
  # elevator, entry point or tour holds one of these keys, or "Manual".
  module Vendors
    SPEC = {
      'Igloohome' => { label: 'Igloohome', account: :igloohome, name: :device_name, device: :device_id, rows: ->(account) { account.igloohome_locks } },
      'Latch'     => { label: 'Latch', account: :latch, name: :lock_name, device: :lock_id, rows: ->(account) { account.latch_locks } },
      'Zerv'      => { label: 'Pynwheel Access (Zerv)', account: :zerv, name: :sub_location_name, device: :mac_id, rows: ->(account) { account.zerv_locks } },
      'Dwelo'     => { label: 'Dwelo', account: :dwelo, name: :name, device: :device_id, rows: ->(account) { account.dwelo_locks } },
      'EdgeState' => { label: 'RemoteLock (EdgeState)', account: :edge_state, name: :name, device: :device_id, rows: ->(account) { account.edgestate_locks } }
    }.freeze

    KEYS = SPEC.keys.freeze
    MANUAL = 'Manual'

    module_function

    def valid?(vendor)
      SPEC.key?(vendor.to_s)
    end

    def label(vendor)
      SPEC.dig(vendor.to_s, :label) || vendor.to_s
    end

    def account(community, vendor)
      spec = SPEC[vendor.to_s]
      spec && community.public_send(spec[:account])
    end

    # The vendor's device rows for the property (an empty relation without an account).
    def rows(community, vendor)
      account = account(community, vendor)
      account ? SPEC[vendor.to_s][:rows].call(account) : nil
    end

    def device_id_of(vendor, row)
      row.public_send(SPEC[vendor.to_s][:device]).to_s
    end

    # The name the legacy unit form shows for a device (AssignLocksHelper#all_locks).
    def display_name(vendor, row)
      case vendor.to_s
      when 'Zerv' then [row.sub_location_name, row.sub_location_friendly_name.presence && "(#{row.sub_location_friendly_name})"].compact.join(' ')
      when 'Dwelo', 'EdgeState' then [row.name, row.remote_lock_type.presence && "(#{row.remote_lock_type})"].compact.join(' ')
      else row.public_send(SPEC[vendor.to_s][:name]).to_s
      end
    end

    # Whether the account carries what its import needs (the legacy "Test
    # Connection" preconditions), and how it authenticates.
    def account_state(vendor, account)
      return { configured: false, mode: nil, status: 'not_configured' } if account.nil?

      case vendor.to_s
      when 'Igloohome'
        mode = account.version.presence || 'v1'
        credentials = account.client_id.present? && account.client_secret.present?
        configured = case mode
                     when 'iglooworks' then account.iglooworks_api_key.present?
                     when 'igloohome' then credentials || account.refresh_token.present?
                     else true # v1: devices come from a CSV or the single-lock form
                     end
        # The code grant ("Authorization Code Grant" on the legacy tab) is
        # chosen but its token is missing or expired: the legacy page's
        # Authorize link has to be followed again.
        code_grant = mode == 'igloohome' && !credentials && (account.is_authorized_with_pynwheel || account.refresh_token.present?)
        needs_auth = code_grant && account.refresh_token_expired?
        { configured: configured, mode: mode, status: needs_auth ? 'needs_authorization' : (configured ? 'connected' : 'not_configured') }
      when 'Latch'
        # The legacy Latch form stores only the building name; the OpenKit
        # credentials are Pynwheel's (ENV), never the row's client_id/secret.
        configured = account.latch_property_name.present?
        { configured: configured, mode: nil, status: configured ? 'connected' : 'not_configured' }
      when 'Zerv'
        # The legacy Test/Import need the login only; facility, badge and card
        # format have defaults in the guest services.
        configured = account.username.present? && account.password.present?
        { configured: configured, mode: nil, status: configured ? 'connected' : 'not_configured' }
      when 'Dwelo'
        configured = account.client_id.present? && account.client_secret.present? && account.default_community_id.present?
        { configured: configured, mode: nil, status: configured ? 'connected' : 'not_configured' }
      when 'EdgeState'
        configured = (account.client_id.present? && account.client_secret.present?) || account.refresh_token.present?
        { configured: configured, mode: nil, status: configured ? 'connected' : 'not_configured' }
      end
    end
  end
end
