# frozen_string_literal: true

module Stops
  # The Tour Setup "Stops" rows: every stop of the property's main tour in
  # its sort order, with the record it points at (name, place, content,
  # whether it is plotted), its lock (through Locks::Inventory, so the Stops
  # and Locks tabs read the same rows) and the setup gaps the design calls
  # out: no pin, no image, no directions, a locked door with no lock.
  # Read-only; the plotting facts are the ones the Connect inventory JSON
  # and the Tour App use (Unit#plotted_on_map?, the amenity's x/y or SVG
  # pointer, an elevator's or entry point's x/y).
  class Rows
    ISSUE_LABELS = { 'no_pin' => 'No pin', 'no_image' => 'No image', 'no_instructions' => 'No directions', 'no_lock' => 'No lock' }.freeze

    def initialize(community, include_codes: false)
      @community = community
      @inventory = Locks::Inventory.new(community, include_codes: include_codes)
    end

    def as_json(*)
      { tour: tour && { id: tour.id, tour_setup_version: tour.tour_setup_version, building_order: Array(tour.building_order) }, stops: rows, issue_labels: ISSUE_LABELS }
    end

    def rows
      tour_stops.map do |stop|
        record = record_of(stop)
        base = { id: stop.id, stop_type: stop.stop_type, stop_id: stop.stop_id, sort: stop.sort, visible: stop.display_stop != false, duration_minutes: stop.duration_minutes }
        next base.merge(name: stop.name.presence || "##{stop.stop_id}", missing: true, record: nil, lock: nil, issues: []) if record.nil?

        content = content_of(record)
        lock = @inventory.lock_state_for(record)
        issues = []
        issues << 'no_pin' unless content[:plotted]
        issues << 'no_image' if %w[unit amenity].include?(stop.stop_type) && !content[:has_image]
        issues << 'no_instructions' if content[:instructions].blank?
        issues << 'no_lock' if lock[:missing]
        base.merge(
          name: Locks::Targets.name_of(record),
          missing: false,
          record: content,
          holder: @inventory.holder_description(record),
          lock: lock,
          issues: issues
        )
      end
    end

    private

      attr_reader :community

      def tour
        return @tour if defined?(@tour)

        @tour = community.community_tour
      end

      def tour_stops
        @tour_stops ||= tour ? tour.tour_stops.order(:sort, :id).to_a : []
      end

      def units
        @units ||= community.units.where(id: ids_of('unit')).includes(:door).index_by(&:id)
      end

      def amenities
        @amenities ||= community.amenities.where(id: ids_of('amenity')).includes(:doors, :amenity_galleries).index_by(&:id)
      end

      def elevators
        @elevators ||= community.elevators.where(id: ids_of('elevator')).index_by(&:id)
      end

      def entry_points
        @entry_points ||= BuildingStartingPoint.where(community_id: community.id, id: ids_of('building_starting_point')).index_by(&:id)
      end

      def ids_of(type)
        tour_stops.select { |stop| stop.stop_type == type }.map(&:stop_id)
      end

      def record_of(stop)
        case stop.stop_type
        when 'unit' then units[stop.stop_id]
        when 'amenity' then amenities[stop.stop_id]
        when 'elevator' then elevators[stop.stop_id]
        when 'building_starting_point' then entry_points[stop.stop_id]
        end
      end

      def positioned?(x, y)
        x.to_i.positive? || y.to_i.positive?
      end

      def content_of(record)
        case record
        when Unit
          {
            kind: 'unit', id: record.id, building: record.building.presence, floor: record.floor, floorplate_id: record.floorplate_id,
            plotted: record.plotted_on_map?, model: record.modal_unit == true, available: record.available,
            has_image: record.image.present? || record.standard_image_url.present?,
            description: record.description.presence, instructions: record.stop_description.presence,
            video_link: nil, virtual_tour_url: record.virtual_tour_url.presence,
            door: record.door && { id: record.door.id, name: record.door.name },
            editable: %w[description instructions virtual_tour_url]
          }
        when Amenity
          {
            kind: 'amenity', id: record.id, building: record.building.presence, floor: record.floor,
            floorplate_id: record.amenityable_type == 'Floorplate' ? record.amenityable_id : nil,
            plotted: positioned?(record.x_plot, record.y_plot) || (record.respond_to?(:pointer_data) && record.pointer_data.is_a?(Hash) && record.pointer_data['x_plot'].present?),
            model: false, available: nil,
            has_image: record.image.present? || record.standard_image_url.present? || record.amenity_galleries.any?,
            description: record.description.presence, instructions: record.directional_text.presence,
            video_link: record.video_link.presence, virtual_tour_url: nil, amenity_type: record.amenity_type.presence,
            show_in_stops_list: record.breezway_lock_visible != false,
            door: record.ordered_doors.first && { id: record.ordered_doors.first.id, name: record.ordered_doors.first.name },
            editable: %w[description instructions video_link]
          }
        when Elevator
          {
            kind: 'elevator', id: record.id, building: record.building.presence, floor: nil, floorplate_id: record.floorplate_id,
            plotted: positioned?(record.x_plot, record.y_plot), model: false, available: nil, has_image: record.image.present?,
            description: record.description.presence, instructions: record.directional_text.presence, video_link: nil, virtual_tour_url: nil,
            covering_range: record.floorplate_covering_range.presence, elevator_kind: record.kind, door: nil,
            editable: %w[name description instructions]
          }
        when BuildingStartingPoint
          {
            kind: 'building_starting_point', id: record.id, building: record.building.presence, floor: record.floor, floorplate_id: nil,
            plotted: positioned?(record.x_plot, record.y_plot), model: false, available: nil, has_image: true,
            description: nil, instructions: record.directional_text.presence, video_link: nil, virtual_tour_url: nil, status: record.status.presence, door: nil,
            editable: %w[name instructions]
          }
        end
      end
  end
end
