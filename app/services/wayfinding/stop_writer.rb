# frozen_string_literal: true

module Wayfinding
  # The `stops` part of a graph save: the "Add Additional Stop" dialog and
  # its edits, persisted into the record the stop type already has a home in:
  #
  #   elevator / stairs / ramp   `elevators` (kind, accessible); an elevator also
  #                              gets the main tour's `tour_stops` row the legacy
  #                              "Add Elevator" creates (never stairs or ramps,
  #                              so the legacy router and app never see them)
  #   door                       `doors` attached to the level (an access point)
  #   entry                      the building's `building_starting_points` row when
  #                              the building has none (with its tour stop, as
  #                              ToursController#building_starting_point); else a
  #                              `wayfinding_stops` row of kind entry
  #   exit, blocker, leasing, restroom, mail, parking, waypoint
  #                              `wayfinding_stops`
  #
  # Stored ids are typed strings: `stop:<id>`, `elevator:<id>`, `door:<id>`,
  # `bsp:<id>`; a created stop's `temp_key` maps to one of them in `key_map`.
  # Coordinates follow the record: icon top-left for elevators, doors and
  # entry points; the marker's centre for `wayfinding_stops`.
  class StopWriter
    KINDS = (WayfindingStop::KINDS + %w[elevator stairs ramp door]).freeze
    VERTICAL = %w[elevator stairs ramp].freeze
    ID_PATTERN = /\A(stop|elevator|door|bsp):(\d+)\z/

    def initialize(save)
      @save = save
    end

    def validate!
      @temp_keys = {}
      @save.stops['create'].each_with_index do |row, i|
        path = "stops.create[#{i}]"
        next @save.record_error(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

        key = row['temp_key'].to_s
        if key.blank? || key =~ /\A\d+\z/ || @temp_keys.key?(key)
          @save.record_error("#{path}.temp_key", 'invalid', 'temp_key must be a unique non-numeric string')
        else
          @temp_keys[key] = i
        end
        @save.record_error("#{path}.kind", 'invalid', 'unknown stop kind') unless KINDS.include?(row['kind'].to_s)
        validate_fields(path, row, kind: row['kind'].to_s, creating: true)
      end
      @save.stops['update'].each_with_index do |row, i|
        path = "stops.update[#{i}]"
        next @save.record_error(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

        record = find_record(row['id'])
        next @save.record_error("#{path}.id", 'unknown_stop', 'no such stop in this property') unless record

        validate_fields(path, row, kind: kind_of(record), creating: false)
      end
      @save.stops['delete'].each_with_index do |row, i|
        path = "stops.delete[#{i}]"
        id = row.is_a?(Hash) ? row['id'] : row
        @save.record_error("#{path}.id", 'unknown_stop', 'no such stop in this property') unless find_record(id)
      end
    end

    def apply!
      @save.stops['create'].each { |row| create(row) }
      @save.stops['update'].each { |row| update(row) }
      @save.stops['delete'].each { |row| destroy(row.is_a?(Hash) ? row['id'] : row) }
    end

    private

      def community
        @save.community
      end

      def level
        @save.level
      end

      def user
        @save.user
      end

      def floorplate?
        level.is_a?(Floorplate)
      end

      def count(key)
        @save.counts[key] += 1
      end

      def validate_fields(path, row, kind:, creating:)
        name = row['name'].to_s.strip
        @save.record_error("#{path}.name", 'required', 'name is required') if creating && name.blank?
        @save.record_error("#{path}.name", 'too_long', 'name is longer than 120 characters') if name.length > 120
        @save.record_error("#{path}.note", 'too_long', 'note is longer than 500 characters') if row['note'].to_s.length > 500
        x = row['x']
        y = row['y']
        if (x.nil? ^ y.nil?) || (!x.nil? && (@save.coerce_number(x).nil? || @save.coerce_number(y).nil?))
          @save.record_error(path, 'invalid_point', 'x and y must both be finite numbers, or both absent')
        end
        if row.key?('floor') && !row['floor'].nil?
          floor = @save.coerce_integer(row['floor'])
          floors = @save.floors_of_level
          @save.record_error("#{path}.floor", 'invalid_floor', 'not a floor of this floorplate') if floor.nil? || (floors.any? && !floors.include?(floor))
        end
        if VERTICAL.include?(kind) && row['floors'].present? && covering_range(row['floors']).nil?
          @save.record_error("#{path}.floors", 'invalid_floors', 'floors must read like "1-12", "Lobby-12" or "1, 3, 5"')
        end
        if row.key?('radius_px') && !row['radius_px'].nil?
          radius = @save.coerce_number(row['radius_px'])
          @save.record_error("#{path}.radius_px", 'invalid', 'radius_px must be a positive number') if radius.nil? || radius <= 0
          @save.record_error("#{path}.radius_px", 'invalid', 'radius_px applies to blockers only') if kind != 'blocker'
        end
        @save.record_error("#{path}.lock_provider", 'too_long', 'lock_provider is too long') if row['lock_provider'].to_s.length > 60
      end

      # "1-12", "Lobby–12", "1, 3, 5" → the `floorplate_covering_range` string
      # Elevator#floors reads ("1-12", or "1,3,5"); nil when unreadable.
      def covering_range(text)
        floors = []
        text.to_s.split(',').each do |piece|
          part = piece.strip
          return nil if part.empty?

          if (m = part.match(/\A(-?\w+)\s*[-–]\s*(-?\w+)\z/))
            from = floor_token(m[1])
            to = floor_token(m[2])
            return nil if from.nil? || to.nil? || to < from || to - from > 200

            floors.concat((from..to).to_a)
          else
            one = floor_token(part)
            return nil if one.nil?

            floors << one
          end
        end
        floors = floors.uniq.sort
        return nil if floors.empty?

        contiguous = floors.each_cons(2).all? { |a, b| b == a + 1 }
        contiguous && floors.size > 1 ? "#{floors.first}-#{floors.last}" : floors.join(',')
      end

      def floor_token(token)
        token = token.to_s.strip
        return 1 if token =~ /\A(lobby|ground|main|l|g)\z/i
        return nil unless token =~ /\A-?\d+\z/

        token.to_i
      end

      def default_range
        floors = community.floorplates.flat_map { |plate| plate.range.present? ? plate.floors : [] }.uniq.sort
        return '1' if floors.empty?

        floors.size > 1 ? "#{floors.min}-#{floors.max}" : floors.first.to_s
      rescue StandardError
        '1'
      end

      def kind_of(record)
        case record
        when WayfindingStop then record.kind
        when Elevator then record.kind
        when Door then 'door'
        when BuildingStartingPoint then 'entry'
        end
      end

      def find_record(typed_id)
        match = typed_id.to_s.match(ID_PATTERN)
        return nil unless match

        id = match[2].to_i
        case match[1]
        when 'stop' then community.wayfinding_stops.find_by(id: id)
        when 'elevator' then community.elevators.find_by(id: id)
        when 'door' then community.doors.find_by(id: id)
        when 'bsp' then BuildingStartingPoint.find_by(community_id: community.id, id: id)
        end
      end

      def typed_id(record)
        case record
        when WayfindingStop then "stop:#{record.id}"
        when Elevator then "elevator:#{record.id}"
        when Door then "door:#{record.id}"
        when BuildingStartingPoint then "bsp:#{record.id}"
        end
      end

      def main_tour
        @main_tour ||= community.community_tour
      end

      def tour_enabled?
        Connect::ProductState.tour?(community)
      end

      def building_of(row)
        row.key?('building') ? row['building'].presence : level.try(:building).presence
      end

      def rounded(value)
        number = @save.coerce_number(value)
        number.nil? ? nil : number.round
      end

      # ── create ─────────────────────────────────────────────────────────

      def create(row)
        kind = row['kind'].to_s
        record =
          case kind
          when *VERTICAL then create_vertical(row, kind)
          when 'door' then create_door(row)
          when 'entry' then create_entry(row)
          else create_wayfinding_stop(row, kind)
          end
        @save.map_key(row['temp_key'].to_s, typed_id(record))
        count(:stops_created)
      end

      def create_wayfinding_stop(row, kind)
        WayfindingStop.create!(
          community: community, map: level, kind: kind, name: row['name'].to_s.strip, building: building_of(row),
          floor: floorplate? ? @save.coerce_integer(row['floor']) : nil,
          x_plot: @save.coerce_number(row['x']), y_plot: @save.coerce_number(row['y']), space: @save.space,
          accessible: row.key?('accessible') ? row['accessible'] == true : true,
          lock_provider: row['lock_provider'].to_s, note: row['note'].to_s.strip.presence,
          radius_px: kind == 'blocker' ? @save.coerce_number(row['radius_px']) : nil,
          created_by_user_id: user&.id
        )
      end

      def create_vertical(row, kind)
        name = row['name'].to_s.strip
        elevator = Elevator.create!(
          name: name, description: name, community_id: community.id, kind: kind,
          x_plot: rounded(row['x']) || 0, y_plot: rounded(row['y']) || 0,
          floorplate_covering_range: row['floors'].present? ? covering_range(row['floors']) : default_range,
          building: building_of(row), floorplate_id: floorplate? ? level.id : nil, sitemap_id: floorplate? ? nil : level.id,
          accessible: row.key?('accessible') ? row['accessible'] == true : kind != 'stairs',
          lock_provider: row['lock_provider'].to_s, directional_text: row['note'].to_s.strip.presence
        )
        # The legacy "Add Elevator" also enrols the elevator in the tour so the
        # routing engine may ride it. Stairs and ramps stay out of `tour_stops`.
        if kind == 'elevator' && tour_enabled? && main_tour
          TourStop.create!(tour_id: main_tour.id, stop_id: elevator.id, stop_type: 'elevator', name: elevator.name,
                           latitude: elevator.x_plot, longitude: elevator.y_plot, display_stop: true)
        end
        elevator
      end

      def create_door(row)
        Door.create!(
          community_id: community.id, attached_with: level, name: row['name'].to_s.strip, name_overrided: true,
          x_plot: rounded(row['x']) || 0, y_plot: rounded(row['y']) || 0, floor: floorplate? ? @save.coerce_integer(row['floor']) : nil,
          lock_provider: row['lock_provider'].to_s, note: row['note'].to_s.strip.presence
        )
      end

      # The first entry of a building is its `building_starting_points` row
      # (what ToursController#building_starting_point creates, with its tour
      # stop); a building that has one gets an additional `wayfinding_stops`
      # entry instead.
      def create_entry(row)
        building = building_of(row)
        existing = BuildingStartingPoint.where(community_id: community.id, building: building)
        return create_wayfinding_stop(row, 'entry') if existing.exists?

        bsp = BuildingStartingPoint.create!(
          community_id: community.id, building: building, floor: floorplate? ? @save.coerce_integer(row['floor']) : nil,
          name: row['name'].to_s.strip, x_plot: rounded(row['x']) || 0, y_plot: rounded(row['y']) || 0,
          lock_provider: row['lock_provider'].to_s, directional_text: row['note'].to_s.strip.presence
        )
        if tour_enabled? && main_tour
          TourStop.create!(tour_id: main_tour.id, stop_id: bsp.id, stop_type: 'building_starting_point', name: bsp.name,
                           latitude: bsp.x_plot, longitude: bsp.y_plot, display_stop: true)
        end
        bsp
      end

      # ── update ─────────────────────────────────────────────────────────

      def update(row)
        record = find_record(row['id'])
        case record
        when WayfindingStop then update_wayfinding_stop(record, row)
        when Elevator then update_elevator(record, row)
        when Door then update_door(record, row)
        when BuildingStartingPoint then update_bsp(record, row)
        end
        count(:stops_updated)
      end

      def position_attrs(row, centre:)
        attrs = {}
        if row['unplot'] == true
          attrs[:x_plot] = centre ? nil : 0
          attrs[:y_plot] = centre ? nil : 0
        elsif row.key?('x') && row.key?('y') && !row['x'].nil?
          attrs[:x_plot] = centre ? @save.coerce_number(row['x']) : rounded(row['x'])
          attrs[:y_plot] = centre ? @save.coerce_number(row['y']) : rounded(row['y'])
        end
        attrs
      end

      def update_wayfinding_stop(stop, row)
        attrs = position_attrs(row, centre: true)
        attrs[:name] = row['name'].to_s.strip if row['name'].present?
        attrs[:note] = row['note'].to_s.strip.presence if row.key?('note')
        attrs[:building] = row['building'].presence if row.key?('building')
        attrs[:floor] = @save.coerce_integer(row['floor']) if row.key?('floor') && floorplate?
        attrs[:accessible] = row['accessible'] == true if row.key?('accessible')
        attrs[:lock_provider] = row['lock_provider'].to_s if row.key?('lock_provider')
        attrs[:radius_px] = @save.coerce_number(row['radius_px']) if row.key?('radius_px') && stop.blocker?
        attrs[:status] = row['status'].to_s if %w[active archived].include?(row['status'].to_s)
        stop.update!(attrs)
      end

      def update_elevator(elevator, row)
        attrs = position_attrs(row, centre: false)
        attrs[:name] = row['name'].to_s.strip if row['name'].present?
        attrs[:directional_text] = row['note'].to_s.strip.presence if row.key?('note')
        attrs[:building] = row['building'].presence if row.key?('building')
        attrs[:floorplate_covering_range] = covering_range(row['floors']) if row['floors'].present?
        attrs[:accessible] = row['accessible'] == true if row.key?('accessible')
        attrs[:lock_provider] = row['lock_provider'].to_s if row.key?('lock_provider')
        elevator.update!(attrs)
        TourStop.where(stop_type: 'elevator', stop_id: elevator.id).update_all(name: elevator.name, latitude: elevator.x_plot, longitude: elevator.y_plot)
      end

      def update_door(door, row)
        attrs = position_attrs(row, centre: false)
        if row['name'].present?
          attrs[:name] = row['name'].to_s.strip
          attrs[:name_overrided] = true
        end
        attrs[:note] = row['note'].to_s.strip.presence if row.key?('note')
        attrs[:floor] = @save.coerce_integer(row['floor']) if row.key?('floor') && floorplate?
        attrs[:lock_provider] = row['lock_provider'].to_s if row.key?('lock_provider')
        door.update!(attrs)
      end

      def update_bsp(bsp, row)
        attrs = position_attrs(row, centre: false)
        attrs[:name] = row['name'].to_s.strip if row['name'].present?
        attrs[:directional_text] = row['note'].to_s.strip.presence if row.key?('note')
        attrs[:building] = row['building'].presence if row.key?('building')
        attrs[:floor] = @save.coerce_integer(row['floor']) if row.key?('floor') && floorplate?
        attrs[:lock_provider] = row['lock_provider'].to_s if row.key?('lock_provider')
        bsp.update!(attrs)
        TourStop.where(stop_type: 'building_starting_point', stop_id: bsp.id).update_all(name: bsp.name, latitude: bsp.x_plot, longitude: bsp.y_plot)
      end

      # ── delete ─────────────────────────────────────────────────────────

      def destroy(typed_id)
        record = find_record(typed_id)
        return unless record

        record.destroy!
        count(:stops_deleted)
      end
  end
end
