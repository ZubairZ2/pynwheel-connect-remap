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
          row.destroy!
          count += 1
        end
      end
      count
    end
  end
end
