# frozen_string_literal: true

module Locks
  # The records a lock can be mapped to (the polymorphic `stop` of the device
  # rows) and the rule that picks where a unit's or amenity's lock lives: on
  # its door when it has one (MapLocksJob#auto_map_locks, UnitsController#update_locks,
  # TourApi::Locks.target_of), else on the record itself.
  module Targets
    TYPES = {
      'unit' => 'Unit', 'amenity' => 'Amenity', 'door' => 'Door', 'access_point' => 'Door',
      'elevator' => 'Elevator', 'building_starting_point' => 'BuildingStartingPoint', 'tour' => 'Tour'
    }.freeze

    module_function

    # The property's record of that kind, or nil. Every lookup is scoped to the
    # property, so a target id cannot name another property's record.
    def find(community, type, id)
      case type.to_s
      when 'unit' then community.units.find_by(id: id)
      when 'amenity' then community.amenities.find_by(id: id)
      when 'door', 'access_point' then community.doors.find_by(id: id)
      when 'elevator' then community.elevators.find_by(id: id)
      when 'building_starting_point' then BuildingStartingPoint.find_by(id: id, community_id: community.id)
      when 'tour'
        tour = community.community_tour
        tour && tour.id == id.to_i ? tour : nil
      end
    end

    # Where the lock of `record` lives: the unit's door, the amenity's first door, else the record.
    def holder_of(record)
      case record
      when Unit then record.door || record
      when Amenity then record.ordered_doors.first || record
      else record
      end
    end

    def kind_of(record)
      case record
      when Unit then 'unit'
      when Amenity then 'amenity'
      when Door then %w[Floorplate Sitemap].include?(record.attached_with_type) ? 'access_point' : 'door'
      when Elevator then 'elevator'
      when BuildingStartingPoint then 'building_starting_point'
      when Tour then 'tour'
      end
    end

    def name_of(record)
      case record
      when Unit then record.marketing_name.presence || record.provider_unit_id.presence || "Unit #{record.id}"
      when Amenity then record.name.presence || "Amenity #{record.id}"
      when Door then record.name.presence || "Door #{record.id}"
      when Elevator then record.name.presence || "Elevator #{record.id}"
      when BuildingStartingPoint then record.name.presence || "Entry point #{record.id}"
      when Tour then record.name.presence || 'Tour start'
      end
    end

    def parent_name(parent)
      case parent
      when Floorplate then parent.name.presence || "Floorplate #{parent.id}"
      when Sitemap then 'Site map'
      else name_of(parent) || parent.class.name
      end
    end

    # The JSON description of a target: identity, where it is, and (for a
    # door) the unit, amenity or map it belongs to.
    def describe(record, tour_stop_ids: {})
      return nil if record.nil?

      kind = kind_of(record)
      out = {
        type: record.class.base_class.name, id: record.id, kind: kind, name: name_of(record),
        building: record.respond_to?(:building) ? record.building.presence : nil,
        floor: record.respond_to?(:floor) ? record.floor : nil,
        tour_stop_id: tour_stop_ids[[record.class.base_class.name.underscore, record.id]]
      }
      if record.is_a?(Door)
        parent = record.attached_with
        out[:parent] = parent ? { type: record.attached_with_type, id: record.attached_with_id, name: parent_name(parent) } : nil
        if out[:parent] && (parent.is_a?(Unit) || parent.is_a?(Amenity))
          out[:parent][:tour_stop_id] = tour_stop_ids[[record.attached_with_type.underscore, record.attached_with_id]]
        end
        out[:building] ||= parent.building.presence if parent.respond_to?(:building)
      end
      out
    end
  end
end
