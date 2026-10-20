# frozen_string_literal: true

require 'csv'

module Locks
  # The lock provider accounts of a property, as the legacy Locks page
  # (`/communities/:id/dwelos/new`, one tab per vendor) creates and edits
  # them: the same rows, the same columns, the same "find or create one
  # account per community, then append the vendor to
  # `communities.multiple_locks_provider`" rule, so the legacy CMS, the legacy
  # mobile API and the Tour App API keep reading what they read today.
  #
  #   Igloohome  igloohomes: `version` (v1 | igloohome | iglooworks) picks the flow;
  #              igloohome: client_id/client_secret or the code grant, home_name;
  #              iglooworks: iglooworks_api_key + iglooworks_department_id;
  #              v1: no credentials (Pynwheel's partner key), locks by CSV or one at a time
  #   Zerv       zervs: username, password, facility_id 0..255, badge_id 0..65535, card_format
  #   Dwelo      dwelos: api_url, default_community_id (Dwelo's community), client_id, client_secret
  #   EdgeState  edge_states: client_id, client_secret (client credentials), or the
  #              RemoteLock code grant the legacy page completes (refresh_token)
  #   Latch      latches: latch_property_name (the Latch building); the API credentials are Pynwheel's (ENV)
  #
  # Every vendor row also carries the visitor instructions: `lock_instruction_text`
  # / `lock_image` for unit doors and `amenity_lock_instruction_text` /
  # `amenity_lock_image` for amenities (base64 uploads, AvatarUploader).
  #
  # Secrets are write-only: a blank secret in an update keeps the stored one,
  # and `describe` only says whether one is stored.
  class Accounts
    # ApplicationHelper#cards_formats, verbatim (the stored value is the label).
    CARD_FORMATS = ['HID Prox 26-bit H10301', 'HID Prox 35-bit C1000', 'HID Prox 37-bit H10304', 'HID Prox 37-bit H10302',
                    '26-bit QuadReal Commerce Place', 'HID Prox 36-bit C10202', 'HID Prox 32-bit SNC', 'HID Prox 48-bit',
                    'HID Wiegand 33-bit D10202', 'HID Prox 33-bit D10202'].freeze
    IGLOO_VERSIONS = %w[v1 igloohome iglooworks].freeze
    FACILITY_RANGE = (0..255)
    BADGE_RANGE = (0..65_535)
    IMAGE_TYPES = %w[image/png image/jpeg image/jpg].freeze
    IMAGE_MAX_BYTES = 5 * 1024 * 1024
    CSV_MAX_BYTES = 1024 * 1024
    DEVICE_ID_MAX = 128

    Result = Struct.new(:vendor, :account, :created, :changes, keyword_init: true)
    ImportResult = Struct.new(:created, :skipped_existing, :skipped_blank, :rows, keyword_init: true)

    def initialize(community)
      @community = community
    end

    def self.describe(vendor, account, base_url: nil)
      new(nil).describe(vendor, account, base_url: base_url)
    end

    # Everything the Locks page shows about an account, without a secret.
    def describe(vendor, account, base_url: nil)
      return nil if account.nil?

      common = {
        id: account.id,
        instructions: { unit: account.lock_instruction_text.presence, amenity: account.amenity_lock_instruction_text.presence },
        images: { unit: image_of(account, :lock_image, base_url), amenity: image_of(account, :amenity_lock_image, base_url) }
      }
      case vendor.to_s
      when 'Igloohome'
        common.merge(
          version: account.version.presence || 'v1',
          # Stored client credentials with no vendor token are what the account
          # runs on (Locks::Vendors.account_state), whatever the legacy radio
          # flag says; the code grant is the mode once a token is attached or
          # when no credentials exist.
          auth_mode: account.client_id.present? && account.client_secret.present? && (!account.is_authorized_with_pynwheel || account.refresh_token.blank?) ? 'client_credentials' : 'code_grant',
          home_name: account.home_name.presence,
          client_id: account.client_id.presence,
          client_secret_present: account.client_secret.present?,
          authorized: account.refresh_token.present? && !account.refresh_token_expired?,
          refresh_token_present: account.refresh_token.present?,
          authorize_url: account.redirect_uri,
          iglooworks_department_id: account.iglooworks_department_id.presence,
          iglooworks_api_key_present: account.iglooworks_api_key.present?
        )
      when 'Zerv'
        common.merge(username: account.username.presence, password_present: account.password.present?,
                     facility_id: account.facility_id.presence, badge_id: account.badge_id.presence, card_format: account.card_format.presence)
      when 'Dwelo'
        common.merge(api_url: account.api_url.presence, default_community_id: account.default_community_id.presence,
                     client_id: account.client_id.presence, client_secret_present: account.client_secret.present?)
      when 'EdgeState'
        common.merge(client_id: account.client_id.presence, client_secret_present: account.client_secret.present?,
                     auth_mode: account.client_id.present? && account.client_secret.present? ? 'client_credentials' : 'code_grant',
                     authorized: account.refresh_token.present?, authorized_with_pynwheel: account.is_authorized_with_pynwheel == true)
      when 'Latch'
        common.merge(latch_property_name: account.latch_property_name.presence,
                     setup: { building_name_added: account.is_building_name_added == true, integration_submitted: account.is_integration_submitted == true,
                              mission_control_setup: account.is_mission_control_setup == true })
      end
    end

    # The choices the forms offer, from the same lists the legacy forms use.
    def self.options(vendor)
      case vendor.to_s
      when 'Igloohome' then { versions: IGLOO_VERSIONS }
      when 'Zerv' then { card_formats: CARD_FORMATS, facility_range: [FACILITY_RANGE.min, FACILITY_RANGE.max], badge_range: [BADGE_RANGE.min, BADGE_RANGE.max] }
      else {}
      end
    end

    # Create or update the vendor's account from the form's fields. Raises
    # Connect::DomainError.invalid with one `errors` entry per field.
    def save!(vendor, fields)
      vendor = vendor.to_s
      raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.') unless Vendors.valid?(vendor)

      fields = (fields.respond_to?(:to_unsafe_h) ? fields.to_unsafe_h : fields.to_h).transform_keys(&:to_s)
      account = Vendors.account(@community, vendor)
      created = account.nil?
      attributes, errors = send("#{vendor.underscore}_attributes", account, fields)
      raise Connect::DomainError.invalid('invalid', errors.first[:message], fields: errors) if errors.any?

      ApplicationRecord.transaction do
        account = build(vendor) if account.nil?
        account.assign_attributes(attributes)
        account.save!
        latch_default_images!(account) if vendor == 'Latch'
        enable_provider!(vendor)
      end
      Result.new(vendor: vendor, account: account, created: created, changes: attributes.keys)
    end

    # The legacy "Remove Account" of the code-grant modes: EdgeState forgets
    # the RemoteLock token; Igloohome forgets its token and, as the legacy
    # action does, falls back to version v1.
    def remove_authorization!(vendor)
      vendor = vendor.to_s
      account = account!(vendor)
      case vendor
      when 'EdgeState'
        raise Connect::DomainError.invalid('not_authorized', 'No RemoteLock authorization is attached.') if account.refresh_token.blank?

        account.update!(refresh_token: nil, is_authorized_with_pynwheel: false)
      when 'Igloohome'
        raise Connect::DomainError.invalid('not_authorized', 'No igloohome authorization is attached.') if account.refresh_token.blank?

        account.update!(refresh_token: nil, is_authorized_with_pynwheel: false, version: 'v1')
      else
        raise Connect::DomainError.invalid('not_supported', "#{Vendors.label(vendor)} has no authorization to remove.")
      end
      account
    end

    # The visitor instructions (unit doors, amenities) of a vendor account.
    def instructions!(vendor, unit:, amenity:)
      account = account!(vendor.to_s)
      account.update!(lock_instruction_text: unit.to_s.strip, amenity_lock_instruction_text: amenity.to_s.strip)
      account
    end

    # One instruction image (`kind` unit | amenity) as the legacy upload sends
    # it: a data URL of a PNG or JPEG, stored through the base64 uploader.
    def image!(vendor, kind:, data_url:)
      account = account!(vendor.to_s)
      column = kind.to_s == 'amenity' ? :amenity_lock_image : :lock_image
      raise Connect::DomainError.invalid('invalid_kind', 'Say whether the image is for unit doors or amenities.') unless %w[unit amenity].include?(kind.to_s)

      data = data_url.to_s
      match = data.match(%r{\Adata:(image/(?:png|jpeg|jpg));base64,([A-Za-z0-9+/=\s]+)\z})
      raise Connect::DomainError.invalid('invalid_image', 'Upload a PNG or JPEG image.') unless match && IMAGE_TYPES.include?(match[1])
      raise Connect::DomainError.invalid('image_too_large', 'The image must be 5 MB or smaller.') if (match[2].bytesize * 3 / 4) > IMAGE_MAX_BYTES

      account.update!(column => data)
      account
    end

    # One Igloohome lock, as the legacy v1 single-lock form adds it.
    def add_device!(device_name:, device_id:)
      account = igloohome_for_devices!
      name = device_name.to_s.strip
      id = device_id.to_s.strip
      errors = []
      errors << { field: 'device_name', code: 'required', message: 'Device name is required.' } if name.blank?
      errors << { field: 'device_id', code: 'required', message: 'Device ID is required.' } if id.blank?
      errors << { field: 'device_id', code: 'too_long', message: "Device ID is longer than #{DEVICE_ID_MAX} characters." } if id.length > DEVICE_ID_MAX
      raise Connect::DomainError.invalid('invalid', errors.first[:message], fields: errors) if errors.any?
      raise Connect::DomainError.invalid('duplicate_device', 'An igloohome lock with this device ID already exists.') if account.igloohome_locks.exists?(device_id: id)

      lock = nil
      ApplicationRecord.transaction do
        lock = account.igloohome_locks.create!(device_name: name, device_id: id)
        enable_provider!('Igloohome')
      end
      lock
    end

    # The legacy v1 CSV import (Igloohome#import_data): a header row, then
    # device name in the first column and device ID in the second. A known
    # device ID is skipped, never updated; a row missing either value is
    # skipped; nothing is deleted.
    def import_csv!(csv)
      account = igloohome_for_devices!
      text = csv.to_s
      raise Connect::DomainError.invalid('empty_csv', 'The CSV file is empty.') if text.strip.empty?
      raise Connect::DomainError.invalid('csv_too_large', 'The CSV must be 1 MB or smaller.') if text.bytesize > CSV_MAX_BYTES

      text = text.delete_prefix("﻿")
      begin
        table = CSV.parse(text, headers: true)
      rescue CSV::MalformedCSVError => e
        raise Connect::DomainError.invalid('malformed_csv', "The CSV could not be read: #{e.message}")
      end
      raise Connect::DomainError.invalid('empty_csv', 'The CSV has a header row but no locks.') if table.empty?

      result = ImportResult.new(created: 0, skipped_existing: 0, skipped_blank: 0, rows: table.size)
      ApplicationRecord.transaction do
        known = account.igloohome_locks.pluck(:device_id).to_set
        table.each do |row|
          name = row[0].to_s.strip
          id = row[1].to_s.strip
          if name.blank? || id.blank?
            result.skipped_blank += 1
          elsif known.include?(id)
            result.skipped_existing += 1
          else
            account.igloohome_locks.create!(device_name: name, device_id: id)
            known << id
            result.created += 1
          end
        end
        enable_provider!('Igloohome')
      end
      result
    end

    private

      def account!(vendor)
        raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.') unless Vendors.valid?(vendor)

        Vendors.account(@community, vendor) || raise(Connect::DomainError.invalid('no_account', "Set up the #{Vendors.label(vendor)} account first."))
      end

      # The v1 forms create the row on first use (IgloohomeV1AccountsController#create_igloohome_account).
      def igloohome_for_devices!
        account = @community.igloohome
        return account if account

        Igloohome.create!(community: @community, username: 'Username', password: 'Password', version: 'v1')
      end

      def build(vendor)
        case vendor
        when 'Igloohome' then Igloohome.new(community: @community, username: 'Username', password: 'Password')
        when 'Zerv' then Zerv.new(community: @community)
        when 'Dwelo' then Dwelo.new(community: @community)
        when 'EdgeState' then EdgeState.new(community: @community)
        when 'Latch' then Latch.new(community: @community)
        end
      end

      # Every legacy account save appends the vendor to the property's providers.
      def enable_provider!(vendor)
        providers = Array(@community.multiple_locks_provider)
        return if providers.include?(vendor)

        @community.update_columns(multiple_locks_provider: providers + [vendor])
      end

      def value(fields, key)
        fields.key?(key) ? fields[key].to_s.strip : nil
      end

      # A secret: nil (absent or blank) keeps what is stored.
      def secret(fields, key)
        v = value(fields, key)
        v.presence
      end

      def required(errors, fields, account, key, label, secret: false)
        v = secret ? secret(fields, key) : value(fields, key)
        stored = account && account.public_send(key).present?
        return v if v.present? || (secret && stored) || (!secret && v.nil? && stored)

        errors << { field: key, code: 'required', message: "#{label} is required." }
        v
      end

      def integer_in(errors, fields, key, label, range)
        v = value(fields, key)
        return nil if v.nil?
        return '' if v.empty?

        errors << { field: key, code: 'range', message: "#{label} must be a whole number from #{range.min} to #{range.max}." } unless v.match?(/\A\d+\z/) && range.cover?(v.to_i)
        v
      end

      def zerv_attributes(account, fields)
        errors = []
        attrs = {}
        username = required(errors, fields, account, 'username', 'Username')
        attrs[:username] = username unless username.nil?
        password = required(errors, fields, account, 'password', 'Password', secret: true)
        attrs[:password] = password if password.present?
        facility = integer_in(errors, fields, 'facility_id', 'Facility ID', FACILITY_RANGE)
        attrs[:facility_id] = facility unless facility.nil?
        badge = integer_in(errors, fields, 'badge_id', 'Badge ID', BADGE_RANGE)
        attrs[:badge_id] = badge unless badge.nil?
        card = value(fields, 'card_format')
        unless card.nil?
          errors << { field: 'card_format', code: 'inclusion', message: 'Choose one of the listed card formats.' } unless card.empty? || CARD_FORMATS.include?(card)
          attrs[:card_format] = card
        end
        [attrs, errors]
      end

      def dwelo_attributes(account, fields)
        errors = []
        attrs = {}
        %w[default_community_id client_id].each do |key|
          v = required(errors, fields, account, key, key == 'client_id' ? 'Client ID' : 'Dwelo community ID')
          attrs[key.to_sym] = v unless v.nil?
        end
        s = required(errors, fields, account, 'client_secret', 'Client secret', secret: true)
        attrs[:client_secret] = s if s.present?
        api_url = value(fields, 'api_url')
        unless api_url.nil?
          if api_url.empty?
            attrs[:api_url] = Dwelo.column_defaults['api_url'] if account.nil? || account.api_url.blank?
          elsif api_url.match?(%r{\Ahttps?://[^\s/]+(/[^\s]*)?\z})
            attrs[:api_url] = api_url.chomp('/')
          else
            errors << { field: 'api_url', code: 'format', message: 'API URL must start with http:// or https://.' }
          end
        end
        [attrs, errors]
      end

      # Client credentials, as the legacy "OAuth Client Credentials" form; the
      # code grant is completed on the legacy page (a browser redirect through
      # RemoteLock). Saving credentials ends a code-grant authorization, as the
      # legacy update does.
      def edge_state_attributes(account, fields)
        errors = []
        attrs = {}
        id = required(errors, fields, account, 'client_id', 'Client ID')
        attrs[:client_id] = id unless id.nil?
        s = required(errors, fields, account, 'client_secret', 'Client secret', secret: true)
        attrs[:client_secret] = s if s.present?
        attrs[:is_authorized_with_pynwheel] = false if account&.is_authorized_with_pynwheel
        [attrs, errors]
      end

      def latch_attributes(account, fields)
        errors = []
        attrs = {}
        name = required(errors, fields, account, 'latch_property_name', 'Building name')
        attrs[:latch_property_name] = name unless name.nil?
        if account.nil?
          attrs[:lock_instruction_text] = UNIT_LATCH_LOCK_INSTRUCTION_TEXT if fields['lock_instruction_text'].to_s.strip.empty?
          attrs[:amenity_lock_instruction_text] = AMENITY_LATCH_LOCK_INSTRUCTION_TEXT if fields['amenity_lock_instruction_text'].to_s.strip.empty?
        end
        %w[lock_instruction_text amenity_lock_instruction_text].each do |key|
          v = value(fields, key)
          attrs[key.to_sym] = v if v.present?
        end
        [attrs, errors]
      end

      def igloohome_attributes(account, fields)
        errors = []
        attrs = {}
        version = value(fields, 'version') || account&.version.presence || 'v1'
        errors << { field: 'version', code: 'inclusion', message: 'Igloo version must be v1, igloohome or iglooworks.' } unless IGLOO_VERSIONS.include?(version)
        attrs[:version] = version
        case version
        when 'igloohome'
          mode = value(fields, 'auth_mode')
          if mode.present?
            errors << { field: 'auth_mode', code: 'inclusion', message: 'Choose client credentials or the authorization code grant.' } unless %w[client_credentials code_grant].include?(mode)
            attrs[:is_authorized_with_pynwheel] = (mode == 'code_grant')
          end
          home = value(fields, 'home_name')
          attrs[:home_name] = home unless home.nil?
          id = value(fields, 'client_id')
          attrs[:client_id] = id unless id.nil?
          s = secret(fields, 'client_secret')
          attrs[:client_secret] = s if s.present?
          if (mode || (account&.is_authorized_with_pynwheel ? 'code_grant' : 'client_credentials')) == 'client_credentials'
            errors << { field: 'client_id', code: 'required', message: 'Client ID is required.' } if (attrs.key?(:client_id) ? attrs[:client_id] : account&.client_id).blank?
            errors << { field: 'client_secret', code: 'required', message: 'Client secret is required.' } if s.blank? && account&.client_secret.blank?
            # Saving credentials ends a code-grant authorization (IgloohomeV2AccountsController#create).
            attrs[:is_authorized_with_pynwheel] = false if account&.is_authorized_with_pynwheel && (id.present? || s.present?)
          end
        when 'v1'
          # Optional developer client on a v1 account: with both values the
          # Tour App API asks the property's own igloohome developer API for
          # the Bluetooth guest key (TourApi::Locks#developer_client?) instead
          # of Pynwheel's partner key. Both or neither.
          if value(fields, 'clear_developer_client') == 'true'
            attrs[:client_id] = nil
            attrs[:client_secret] = nil
          else
            id = value(fields, 'client_id')
            attrs[:client_id] = id unless id.nil?
            s = secret(fields, 'client_secret')
            attrs[:client_secret] = s if s.present?
            final_id = attrs.key?(:client_id) ? attrs[:client_id] : account&.client_id
            final_secret = s.presence || account&.client_secret
            if final_id.present? && final_secret.blank?
              errors << { field: 'client_secret', code: 'required', message: 'Client secret is required with a client ID.' }
            elsif final_id.blank? && final_secret.present? && !id.nil?
              errors << { field: 'client_id', code: 'required', message: 'Client ID is required with a client secret.' }
            end
          end
        when 'iglooworks'
          dept = value(fields, 'iglooworks_department_id')
          attrs[:iglooworks_department_id] = dept unless dept.nil?
          key = secret(fields, 'iglooworks_api_key')
          attrs[:iglooworks_api_key] = key if key.present?
          errors << { field: 'iglooworks_department_id', code: 'required', message: 'Department ID is required.' } if (attrs.key?(:iglooworks_department_id) ? attrs[:iglooworks_department_id] : account&.iglooworks_department_id).blank?
          errors << { field: 'iglooworks_api_key', code: 'required', message: 'API key is required.' } if key.blank? && account&.iglooworks_api_key.blank?
        end
        [attrs, errors]
      end

      # LatchAccountsController#update_default_image: the two bundled PNGs
      # stand in until the property uploads its own.
      def latch_default_images!(account)
        { amenity_lock_image: 'latch-lock-image-amenity.png', lock_image: 'latch-lock-image-unit.png' }.each do |column, file|
          next if account.read_attribute(column).present?

          path = Rails.root.join('app', 'assets', 'images', file)
          next unless File.exist?(path)

          account.update!(column => "data:image/png;base64,#{Base64.strict_encode64(File.binread(path))}")
        end
      end

      def image_of(account, column, base_url)
        return nil if account.read_attribute(column).blank?

        Connect::UploadUrl.file(account, column, base_url || '')
      rescue StandardError => e
        Rails.logger.info("[Locks::Accounts] image url unavailable: #{e.class}: #{e.message}")
        { url: nil, file_name: File.basename(account.read_attribute(column).to_s) }
      end
  end
end
