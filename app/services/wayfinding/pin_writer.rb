# frozen_string_literal: true

module Wayfinding
  # The `pins` part of a graph save: where the legacy icon records and the
  # unit / amenity pins sit on the level. Each write reuses the columns and
  # callbacks of the legacy plotting action it replaces:
  #
  #   units                     UnitsController#ajaxplotunitforfloorplate / #ajaxplotunit,
  #                             #remove_plot_from_floorplate / #remove_plot
  #   amenities                 FloorplateAmenitiesController#plot_amenity / #remove_amenity
  #   elevators                 ToursController#update_elevator, ElevatorsController#remove_elevator_plotting
  #   building_starting_points  ToursController#update_building_starting_point
  #   doors                     UnitsController#plot_unit_door / #remove_unit_door_plot
  #   tour_start                ToursController#ajaxplotstartingpoint (every tour of the property)
  #
  # with the one fix the report asked for: the `tour_stops` coordinate copies
  # are updated with a `stop_type` filter (the legacy actions matched by
  # `stop_id` alone, across types).
  #
  # A row is `{id, x, y}` in storage units (icon top-left for the legacy
  # records, the pin point for units and amenities), `{id, pointer: {...}}`
  # for an SVG placement, or `{id, unplot: true}`.
  class PinWriter
    SCOPES = {
      'units' => ->(community) { community.units },
      'amenities' => ->(community) { community.amenities },
      'elevators' => ->(community) { community.elevators },
      'building_starting_points' => ->(community) { BuildingStartingPoint.where(community_id: community.id) },
      'doors' => ->(community) { community.doors }
    }.freeze

    def initialize(save)
      @save = save
    end

    def validate!
      SCOPES.each do |group, scope|
        rows = @save.pins[group]
        rows.each_with_index do |row, i|
          path = "pins.#{group}[#{i}]"
          next @save.record_error(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          id = @save.coerce_integer(row['id'])
          if id.nil? || !scope.call(community).where(id: id).exists?
            @save.record_error("#{path}.id", 'unknown_record', 'no such record in this property')
            next
          end
          next if row['unplot'] == true

          if %w[units amenities].include?(group) && row['pointer'].is_a?(Hash)
            pointer = row['pointer']
            @save.record_error("#{path}.pointer", 'invalid', 'pointer must hold finite x_plot and y_plot') if @save.coerce_number(pointer['x_plot']).nil? || @save.coerce_number(pointer['y_plot']).nil?
            next
          end
          @save.record_error(path, 'invalid_point', 'x and y must be finite numbers') if @save.coerce_number(row['x']).nil? || @save.coerce_number(row['y']).nil?
        end
      end
      return unless @save.tour_start

      start = @save.tour_start
      @save.record_error('pins.tour_start', 'invalid_point', 'x and y must be finite numbers') if @save.coerce_number(start['x']).nil? || @save.coerce_number(start['y']).nil?
    end

    def apply!
      @save.pins['units'].each { |row| row['unplot'] == true ? unplot_unit(row) : plot_unit(row) }
      @save.pins['amenities'].each { |row| row['unplot'] == true ? unplot_amenity(row) : plot_amenity(row) }
      @save.pins['elevators'].each { |row| place_icon(Elevator, 'elevator', row) }
      @save.pins['building_starting_points'].each { |row| place_icon(BuildingStartingPoint, 'building_starting_point', row) }
      @save.pins['doors'].each { |row| place_door(row) }
      place_tour_start(@save.tour_start) if @save.tour_start
    end

    private

      def community
        @save.community
      end

      def level
        @save.level
      end

      def floorplate?
        level.is_a?(Floorplate)
      end

      def pointer_hash(pointer)
        {
          x_plot: @save.coerce_number(pointer['x_plot']), y_plot: @save.coerce_number(pointer['y_plot']),
          tag: pointer['tag'].presence, id: pointer['id'].presence, selector: pointer['selector'].presence
        }
      end

      def count(key)
        @save.counts[key] += 1
      end

      # ── units ──────────────────────────────────────────────────────────

      def plot_unit(row)
        unit = community.units.find(@save.coerce_integer(row['id']))
        if row['pointer'].is_a?(Hash)
          unit.pointer_data = pointer_hash(row['pointer'])
        else
          unit.x_plot = @save.coerce_number(row['x']).round
          unit.y_plot = @save.coerce_number(row['y']).round
        end
        unit.floorplate_id = floorplate? ? level.id : nil
        unit.save!(validate: false)
        TourStop.where(stop_type: 'unit', stop_id: unit.id).update_all(latitude: unit.x_plot, longitude: unit.y_plot)
        count(:units_plotted)
      end

      # The legacy unplot: the pin or the SVG pointer is cleared, the unit's
      # tour stops go (a modal unit keeps its stop at 0/0), and the unit
      # leaves the floorplate once nothing places it there any more.
      def unplot_unit(row)
        unit = community.units.find(@save.coerce_integer(row['id']))
        if row['space'].to_s == 'svg'
          unit.pointer_data = {}
        else
          unit.x_plot = 0
          unit.y_plot = 0
        end
        placed_elsewhere = unit.x_plot.to_i.positive? || unit.y_plot.to_i.positive? || (unit.pointer_data.is_a?(Hash) && unit.pointer_data['x_plot'].present?)
        unit.floorplate_id = nil if floorplate? && !placed_elsewhere
        stops = TourStop.joins(:tour).where(tours: { community_id: community.id }, stop_type: 'unit', stop_id: unit.id)
        if unit.modal_unit
          stops.update_all(latitude: 0, longitude: 0)
        else
          stops.find_each { |stop| TourStops::Remove.call!(stop) }
        end
        unit.save!(validate: false)
        count(:units_unplotted)
      end

      # ── amenities ──────────────────────────────────────────────────────

      def plot_amenity(row)
        amenity = community.amenities.find(@save.coerce_integer(row['id']))
        amenity.amenityable_type = level.class.base_class.name
        amenity.amenityable_id = level.id
        if row['pointer'].is_a?(Hash)
          amenity.pointer_data = pointer_hash(row['pointer'])
        else
          amenity.x_plot = @save.coerce_number(row['x']).round
          amenity.y_plot = @save.coerce_number(row['y']).round
        end
        amenity.floor = @save.coerce_integer(row['floor']) if row.key?('floor') && floorplate?
        amenity.save!(validate: false)
        TourStop.where(stop_type: 'amenity', stop_id: amenity.id).update_all(latitude: amenity.x_plot, longitude: amenity.y_plot)
        count(:amenities_plotted)
      end

      def unplot_amenity(row)
        amenity = community.amenities.find(@save.coerce_integer(row['id']))
        if row['space'].to_s == 'svg'
          amenity.pointer_data = {}
        else
          amenity.x_plot = 0
          amenity.y_plot = 0
        end
        amenity.save!(validate: false)
        TourStop.joins(:tour).where(tours: { community_id: community.id }, stop_type: 'amenity', stop_id: amenity.id).find_each do |stop|
          TourStops::Remove.call!(stop)
        end
        count(:amenities_unplotted)
      end

      # ── elevators, entry points ────────────────────────────────────────

      def place_icon(klass, stop_type, row)
        record = klass.where(community_id: community.id).find(@save.coerce_integer(row['id']))
        if row['unplot'] == true
          record.update!(x_plot: 0, y_plot: 0)
        else
          record.update!(x_plot: @save.coerce_number(row['x']).round, y_plot: @save.coerce_number(row['y']).round)
        end
        TourStop.where(stop_type: stop_type, stop_id: record.id).update_all(latitude: record.x_plot, longitude: record.y_plot)
        count(:"#{stop_type}s_placed")
      end

      def place_door(row)
        door = community.doors.find(@save.coerce_integer(row['id']))
        if row['unplot'] == true
          door.destroy!
          count(:doors_removed)
        else
          door.update!(x_plot: @save.coerce_number(row['x']).round, y_plot: @save.coerce_number(row['y']).round)
          count(:doors_placed)
        end
      end

      def place_tour_start(start)
        attrs = { x_plot: @save.coerce_number(start['x']).round, y_plot: @save.coerce_number(start['y']).round }
        floor = @save.coerce_integer(start['floor'])
        attrs[:starting_floor] = floor if floor && floorplate?
        attrs[:building] = start['building'].to_s if start.key?('building') && start['building'].present?
        Tour.where(community_id: community.id).update_all(attrs)
        count(:tour_start_placed)
      end
  end
end
