# frozen_string_literal: true

module Locks
  # "Delete all imported locks" of one vendor: what the legacy per-vendor
  # `remove_*_locks` actions do (`destroy_all`, so each row's
  # `clear_lock_provider` callback blanks its stop's provider).
  module Purge
    module_function

    def call(community, vendor:)
      vendor = vendor.to_s
      raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.') unless Vendors.valid?(vendor)

      rows = Vendors.rows(community, vendor)
      raise Connect::DomainError.invalid('no_account', "This property has no #{Vendors.label(vendor)} account.") if rows.nil?

      count = 0
      ApplicationRecord.transaction do
        rows.find_each do |row|
          holder = row.stop_id.present? ? (row.stop rescue nil) : nil
          row.destroy!
          count += 1
          release_holder!(holder, vendor)
        end
      end
      count
    end

    # The legacy destroy callback blanks only the holder's `lock_provider`; the
    # access code and the unit's or amenity's own provider (set when a device
    # is mapped to its door) stayed behind and read as "locked, no lock".
    def release_holder!(holder, vendor)
      return if holder.nil?

      holder.update_columns(lock_provider: '', access_code: '') if holder.lock_provider.blank? || holder.lock_provider == vendor
      parent = holder.is_a?(Door) ? holder.attached_with : nil
      parent.update_columns(lock_provider: '', access_code: '') if (parent.is_a?(Unit) || parent.is_a?(Amenity)) && parent.lock_provider == vendor
    end
  end
end
