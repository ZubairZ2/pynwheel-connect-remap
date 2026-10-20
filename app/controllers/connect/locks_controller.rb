# frozen_string_literal: true

module Connect
  # The Tour Setup "Locks" tab of Pynwheel Connect, on the existing lock
  # records and vendor services (see Locks::Inventory, Locks::Assign,
  # Locks::AutoMatch, Locks::Sync, Locks::Purge).
  #
  #   GET  /communities/:community_id/connect/locks.json              the inventory
  #   GET  /communities/:community_id/connect/locks/auto_match.json   the proposals (nothing changes)
  #   PUT  /communities/:community_id/connect/locks/map.json          {vendor, device_id, target_type, target_id}
  #   PUT  /communities/:community_id/connect/locks/unmap.json        {vendor, device_id}
  #   PUT  /communities/:community_id/connect/locks/manual_code.json  {target_type, target_id, code} (code "" clears the lock)
  #   POST /communities/:community_id/connect/locks/auto_match.json   {pairs: [{vendor, device_id, target_type, target_id}]}
  #   POST /communities/:community_id/connect/locks/sync.json         {vendor}
  #   POST /communities/:community_id/connect/locks/test.json         {vendor}
  #   DELETE /communities/:community_id/connect/locks/purge.json      {vendor}
  #   PUT  /communities/:community_id/connect/locks/enabled.json      {enabled}
  #   PUT  /communities/:community_id/connect/locks/account.json      {vendor, fields: {…}} create or update the vendor account (Locks::Accounts)
  #   PUT  /communities/:community_id/connect/locks/account/remove_authorization.json {vendor} forget a code-grant token
  #   PUT  /communities/:community_id/connect/locks/instructions.json {vendor, unit, amenity}
  #   PUT  /communities/:community_id/connect/locks/instruction_image.json {vendor, kind, image} (a PNG/JPEG data URL)
  #   POST /communities/:community_id/connect/locks/devices.json      {device_name, device_id} one igloohome v1 lock
  #   POST /communities/:community_id/connect/locks/import_csv.json   {csv} the igloohome v1 CSV (name, device id)
  #
  # Every write answers the whole inventory again, so the page never shows a
  # state the database does not hold.
  class LocksController < BaseController
    CONNECT_READ_ACTIONS = %w[index auto_match_preview].freeze
    CONNECT_WRITE_ACTIONS = %w[map unmap manual_code auto_match_apply sync test purge enabled account remove_authorization instructions instruction_image add_device import_csv].freeze

    def index
      render_connect(inventory_json)
    end

    def auto_match_preview
      proposals = Locks::AutoMatch.preview(@community, vendor: params[:vendor].presence)
      render_connect(proposals: proposals.map(&:to_h).map { |row| row.except(:holder) })
    end

    def map
      result = Locks::Assign.map!(@community, vendor: params[:vendor], device_id: params[:device_id], target_type: params[:target_type], target_id: params[:target_id])
      audit('lock_map', vendor: result.vendor, device_id: params[:device_id].to_s, holder: holder_ref(result.holder))
      render_write(inventory_json.merge(changed: { vendor: result.vendor, holder: Locks::Targets.describe(result.holder) }))
    end

    def unmap
      result = Locks::Assign.new(@community).unmap!(vendor: params[:vendor], device_id: params[:device_id])
      audit('lock_unmap', vendor: result.vendor, device_id: params[:device_id].to_s, holder: result.holder && holder_ref(result.holder))
      render_write(inventory_json.merge(changed: { vendor: result.vendor, holder: Locks::Targets.describe(result.holder) }))
    end

    def manual_code
      assigner = Locks::Assign.new(@community)
      result = if params[:code].to_s.strip.empty?
                 assigner.clear!(target_type: params[:target_type], target_id: params[:target_id])
               else
                 assigner.manual_code!(target_type: params[:target_type], target_id: params[:target_id], code: params[:code])
               end
      audit(result.vendor ? 'lock_manual_code' : 'lock_clear', holder: holder_ref(result.holder))
      render_write(inventory_json.merge(changed: { vendor: result.vendor, holder: Locks::Targets.describe(result.holder) }))
    end

    def auto_match_apply
      pairs = params[:pairs].is_a?(Array) ? params[:pairs] : []
      raise Connect::DomainError.invalid('nothing_to_apply', 'Pick at least one match.') if pairs.empty?

      applied = Locks::AutoMatch.apply!(@community, pairs.map { |pair| pair.respond_to?(:to_unsafe_h) ? pair.to_unsafe_h : pair })
      audit('lock_auto_match', count: applied.size)
      render_write(inventory_json.merge(applied: applied))
    end

    def sync
      outcome = Locks::Sync.sync!(@community, vendor: params[:vendor])
      audit('lock_sync', vendor: params[:vendor].to_s, status: outcome.status, count: outcome.count)
      render_write(inventory_json.merge(sync: outcome.to_h))
    end

    def test
      outcome = Locks::Sync.test(@community, vendor: params[:vendor])
      render_write(test: outcome.to_h.merge(vendor: params[:vendor].to_s))
    end

    def purge
      count = Locks::Purge.call(@community, vendor: params[:vendor])
      audit('lock_purge', vendor: params[:vendor].to_s, count: count)
      render_write(inventory_json.merge(purged: { vendor: params[:vendor].to_s, count: count }))
    end

    # The property's "Enable locks" switch (communities.enable_locks, the Settings page).
    def enabled
      raise Connect::DomainError.invalid('missing_enabled', 'Say whether locks are on or off.') unless params.key?(:enabled)

      value = boolean(params[:enabled])
      @community.update_columns(enable_locks: value) if @community.enable_locks != value
      audit('locks_enabled', enabled: value)
      render_write(inventory_json)
    end

    # The vendor account form of the legacy Locks page: one account per vendor
    # per property, created on first save, secrets kept when left blank.
    def account
      fields = params[:fields].respond_to?(:to_unsafe_h) ? params[:fields].to_unsafe_h : {}
      result = Locks::Accounts.new(@community).save!(params[:vendor], fields)
      audit(result.created ? 'lock_account_created' : 'lock_account_updated', vendor: result.vendor, fields: result.changes.map(&:to_s))
      render_write(inventory_json.merge(account: { vendor: result.vendor, created: result.created }))
    end

    def remove_authorization
      Locks::Accounts.new(@community).remove_authorization!(params[:vendor])
      audit('lock_authorization_removed', vendor: params[:vendor].to_s)
      render_write(inventory_json.merge(account: { vendor: params[:vendor].to_s, authorization_removed: true }))
    end

    def instructions
      Locks::Accounts.new(@community).instructions!(params[:vendor], unit: params[:unit], amenity: params[:amenity])
      audit('lock_instructions', vendor: params[:vendor].to_s)
      render_write(inventory_json)
    end

    def instruction_image
      Locks::Accounts.new(@community).image!(params[:vendor], kind: params[:kind], data_url: params[:image])
      audit('lock_instruction_image', vendor: params[:vendor].to_s, kind: params[:kind].to_s)
      render_write(inventory_json)
    end

    def add_device
      lock = Locks::Accounts.new(@community).add_device!(device_name: params[:device_name], device_id: params[:device_id])
      audit('lock_device_added', vendor: 'Igloohome', device_id: lock.device_id)
      render_write(inventory_json.merge(device: { vendor: 'Igloohome', id: lock.id, device_id: lock.device_id, name: lock.device_name }))
    end

    def import_csv
      result = Locks::Accounts.new(@community).import_csv!(params[:csv])
      audit('lock_csv_import', vendor: 'Igloohome', created: result.created, skipped_existing: result.skipped_existing, skipped_blank: result.skipped_blank)
      render_write(inventory_json.merge(imported: result.to_h.merge(vendor: 'Igloohome')))
    end

    private

      def inventory_json
        Locks::Inventory.new(@community, include_codes: current_user&.can_edit_map?(@community) == true, base_url: request.base_url).as_json
      end

      def render_write(data)
        render json: Connect::ResponseEnvelope.new(data: data, meta: connect_write_meta).as_json
      end

      def holder_ref(holder)
        holder && { type: holder.class.base_class.name, id: holder.id }
      end

      # One PaperTrail row per change, as TourSetup::Save writes one.
      def audit(event, payload = {})
        PaperTrail::Version.create!(
          item_type: 'Community', item_id: @community.id, event: event, whodunnit: current_user&.id&.to_s,
          community_id: @community.id, company_id: @community.company_id, object: payload.to_json
        )
      rescue StandardError => e
        Rails.logger.warn("[Connect::LocksController] audit row not written: #{e.class}: #{e.message}")
      end
  end
end
