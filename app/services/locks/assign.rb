# frozen_string_literal: true

module Locks
  # Mapping one imported device to one stop, unmapping it, and the manual
  # keypad code, through the legacy rules:
  #   - AssignLocksHelper (the unit grid's lock select, the unit / amenity /
  #     door forms): a device is taken from its previous stop (whose provider
  #     is cleared) and pointed at the new one; `lock_id == ""` unmaps.
  #   - the door rule (MapLocksJob#auto_map_locks, UnitsController#update_locks):
  #     a unit's or amenity's lock lives on its door when it has one.
  #   - `lock_provider` + `access_code` on the holder: the vendor and the
  #     device id for a digital lock (what MapLocksJob and the grid write),
  #     "Manual" and the keypad code for a manual lock (the unit form's rule:
  #     digits, # and *, up to 10 characters).
  # Column writes go through `update_columns`, as the legacy helpers do, so no
  # unrelated model callback runs; every change is wrapped in one transaction.
  class Assign
    include AssignLocksHelper

    MANUAL_CODE = /\A[0-9#*]{1,10}\z/

    Result = Struct.new(:holder, :device, :vendor, keyword_init: true)

    def initialize(community)
      @community = community
    end

    def self.map!(community, **args)
      new(community).map!(**args)
    end

    # Points the vendor's device at the target (its door when it has one).
    def map!(vendor:, device_id:, target_type:, target_id:)
      vendor = vendor.to_s
      raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.') unless Vendors.valid?(vendor)

      row = device_row!(vendor, device_id)
      target = target!(target_type, target_id)
      holder = Targets.holder_of(target)

      ApplicationRecord.transaction do
        release_manual!(holder) if holder.lock_provider == Vendors::MANUAL
        # A device of another vendor on this holder is released first; the
        # legacy helpers only move devices of the holder's own provider.
        release_other_vendors!(holder, vendor)
        holder.update_columns(lock_provider: vendor, access_code: Vendors.device_id_of(vendor, row))
        if holder.is_a?(Door)
          assign_lock_to_door(@community, holder, Vendors.device_id_of(vendor, row))
          # MapLocksJob#update_door_lock also records the provider on the unit / amenity the door belongs to.
          parent = holder.attached_with
          parent.update_columns(lock_provider: vendor, access_code: Vendors.device_id_of(vendor, row)) if parent.is_a?(Unit) || parent.is_a?(Amenity)
        else
          assign_lock(@community, holder, Vendors.device_id_of(vendor, row))
        end
        row.reload
        raise Connect::DomainError.invalid('not_mapped', 'The lock could not be mapped to that stop.') unless row.stop_type == holder.class.base_class.name && row.stop_id == holder.id
      end
      Result.new(holder: holder, device: row, vendor: vendor)
    end

    # Detaches the device from whatever it is mapped to and clears the
    # holder's provider (and the unit's / amenity's when the holder is its door).
    def unmap!(vendor:, device_id:)
      vendor = vendor.to_s
      raise Connect::DomainError.invalid('unknown_vendor', 'Unknown lock provider.') unless Vendors.valid?(vendor)

      row = device_row!(vendor, device_id)
      holder = row.stop_id.present? ? holder_of_row(row) : nil
      ApplicationRecord.transaction do
        if holder
          clear_device!(holder, vendor, row)
        else
          row.update_columns(stop_id: nil, stop_type: nil)
        end
      end
      Result.new(holder: holder, device: row, vendor: vendor)
    end

    # Sets the fixed keypad code on the target's lock holder, releasing any mapped device first.
    def manual_code!(target_type:, target_id:, code:)
      code = code.to_s.strip
      raise Connect::DomainError.invalid('invalid_code', 'Use digits, # and * only, up to 10 characters.') unless MANUAL_CODE.match?(code)

      target = target!(target_type, target_id)
      holder = Targets.holder_of(target)
      ApplicationRecord.transaction do
        release_devices!(holder)
        holder.update_columns(lock_provider: Vendors::MANUAL, access_code: code)
      end
      Result.new(holder: holder, device: nil, vendor: Vendors::MANUAL)
    end

    # Removes the lock from the target's holder: devices released, provider and code cleared.
    def clear!(target_type:, target_id:)
      target = target!(target_type, target_id)
      holder = Targets.holder_of(target)
      ApplicationRecord.transaction do
        release_devices!(holder)
        holder.update_columns(lock_provider: '', access_code: '')
        parent = holder.is_a?(Door) ? holder.attached_with : nil
        parent.update_columns(lock_provider: '', access_code: '') if parent.is_a?(Unit) || parent.is_a?(Amenity)
      end
      Result.new(holder: holder, device: nil, vendor: nil)
    end

    private

      def device_row!(vendor, device_id)
        rows = Vendors.rows(@community, vendor)
        raise Connect::DomainError.invalid('no_account', "This property has no #{Vendors.label(vendor)} account.") if rows.nil?

        column = Vendors::SPEC[vendor][:device]
        rows.find_by(column => device_id.to_s) || raise(Connect::DomainError.not_found('No such lock on this property.'))
      end

      def target!(type, id)
        raise Connect::DomainError.invalid('invalid_target', 'Unknown target type.') unless Targets::TYPES.key?(type.to_s)

        Targets.find(@community, type, id) || raise(Connect::DomainError.not_found('No such stop on this property.'))
      end

      def holder_of_row(row)
        case row.stop_type
        when 'Unit' then @community.units.find_by(id: row.stop_id)
        when 'Amenity' then @community.amenities.find_by(id: row.stop_id)
        when 'Door' then @community.doors.find_by(id: row.stop_id)
        when 'Elevator' then @community.elevators.find_by(id: row.stop_id)
        when 'BuildingStartingPoint' then BuildingStartingPoint.find_by(id: row.stop_id, community_id: @community.id)
        when 'Tour' then @community.community_tour&.id == row.stop_id ? @community.community_tour : nil
        end
      end

      # The legacy unmap (`lock_id == ""`) for the holder's own provider; a
      # device row that disagrees with the holder's provider is cleared directly.
      def clear_device!(holder, vendor, row)
        if holder.lock_provider == vendor
          holder.is_a?(Door) ? assign_lock_to_door(@community, holder, '') : assign_lock(@community, holder, '')
        end
        row.reload
        row.update_columns(stop_id: nil, stop_type: nil) if row.stop_id.present?
        holder.update_columns(lock_provider: '', access_code: '') if holder.lock_provider == vendor || holder.lock_provider.blank?
        parent = holder.is_a?(Door) ? holder.attached_with : nil
        parent.update_columns(lock_provider: '', access_code: '') if (parent.is_a?(Unit) || parent.is_a?(Amenity)) && parent.lock_provider == vendor
      end

      def release_devices!(holder)
        Vendors::KEYS.each { |vendor| release_vendor!(holder, vendor) }
      end

      def release_other_vendors!(holder, keep)
        Vendors::KEYS.each { |vendor| release_vendor!(holder, vendor) unless vendor == keep }
      end

      def release_vendor!(holder, vendor)
        rows = Vendors.rows(@community, vendor)
        return if rows.nil?

        rows.where(stop_type: holder.class.base_class.name, stop_id: holder.id).find_each { |row| clear_device!(holder, vendor, row) }
      end

      def release_manual!(holder)
        holder.update_columns(lock_provider: '', access_code: '')
      end
  end
end
