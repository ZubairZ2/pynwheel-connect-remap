# frozen_string_literal: true

module Locks
  # Auto-match: the legacy "Map Units" matching (MapLocksJob#parse_stop — a
  # device named like a unit's marketing name or provider id, optionally
  # "Building-Unit", a door, an amenity, an elevator, an entry point or the
  # tour) run as a preview over the unmapped devices only. The legacy job
  # clears every mapping of the vendor and re-maps all its devices at once;
  # here nothing changes until the staff member applies the proposals they
  # kept, and existing mappings are left alone.
  module AutoMatch
    Proposal = Struct.new(:vendor, :device_id, :device_name, :target, :holder, :confidence, keyword_init: true)

    module_function

    def preview(community, vendor: nil)
      inventory = Inventory.new(community)
      vendors = vendor.present? ? [vendor.to_s] : Vendors::KEYS
      taken = inventory.locks.select { |lock| lock[:mapped] }.filter_map { |lock| lock[:target] && [lock[:target][:type], lock[:target][:id]] }.to_set
      matcher = MapLocksJob.new
      proposals = []
      vendors.each do |key|
        rows = Vendors.rows(community, key)
        next if rows.nil?

        rows.where(stop_id: nil).order(:id).each do |row|
          name = Vendors.display_name(key, row)
          raw = row.public_send(Vendors::SPEC[key][:name]).to_s
          record = raw.present? ? safe_parse(matcher, community, raw) : nil
          next unless record

          holder = Targets.holder_of(record)
          holder_key = [holder.class.base_class.name, holder.id]
          next if taken.include?(holder_key) || holder.lock_provider == Vendors::MANUAL
          next if proposals.any? { |p| p.holder == holder_key }

          proposals << Proposal.new(vendor: key, device_id: Vendors.device_id_of(key, row), device_name: name,
                                    target: Targets.describe(record), holder: holder_key, confidence: 'exact')
        end
      end
      proposals
    end

    # Applies the chosen proposals: `[{vendor, device_id, target_type, target_id}]`.
    MAX_PAIRS = 500

    # All or nothing: one failing pair (unknown device, foreign target, a row
    # that did not move) rolls every earlier pair back, so the page never
    # shows a half-applied match.
    def apply!(community, pairs)
      pairs = Array(pairs)
      raise Connect::DomainError.invalid('too_many', "Apply at most #{MAX_PAIRS} matches at a time.") if pairs.size > MAX_PAIRS

      assigner = Assign.new(community)
      applied = []
      ApplicationRecord.transaction do
        pairs.each do |pair|
          pair = pair.to_h.with_indifferent_access
          result = assigner.map!(vendor: pair[:vendor], device_id: pair[:device_id], target_type: pair[:target_type], target_id: pair[:target_id])
          applied << { vendor: result.vendor, device_id: Vendors.device_id_of(result.vendor, result.device), holder: Targets.describe(result.holder) }
        end
      end
      applied
    end

    def safe_parse(matcher, community, name)
      matcher.parse_stop(community, name)
    rescue StandardError => e
      Rails.logger.warn("[Locks::AutoMatch] parse_stop failed for #{name.inspect}: #{e.class}: #{e.message}")
      nil
    end
  end
end
