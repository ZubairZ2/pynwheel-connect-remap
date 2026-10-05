# frozen_string_literal: true

module TourSetup
  # One Connect save of the Tour Setup screen: stops added, removed, hidden or
  # shown, reordered, their dwell time, and elevators deleted - in one
  # transaction against the property's main tour, compare-and-swapped on
  # `tours.tour_setup_version`.
  #
  # Each part reuses the legacy behaviour it replaces:
  #   add         ToursController#ajaxplottourstoppoint (through TourStops::Membership,
  #               so a record is never a stop twice)
  #   remove      TourStopsController#destroy (TourStops::Remove; the physical
  #               elevator / entry point is kept)
  #   visibility  ToursController#display_stop (absolute, not a toggle)
  #   order       `tour_stops.sort` 1..n in the given order (rails_sortable's column;
  #               `tours.sort_hash` is left to the legacy page - decision D1)
  #   duration    `tour_stops.duration_minutes`
  #   elevators.delete  ElevatorsController#destroy (the model hook removes its
  #               stops in every tour)
  #
  # Phase 1 writes no new `stop_type`: adds are units and amenities only.
  class Save
    MAX_OPS = 1000

    Result = Struct.new(:tour, :version, :key_map, :counts, keyword_init: true)

    def self.call(**options)
      new(**options).call
    end

    def initialize(community:, user:, payload:)
      @community = community
      @user = user
      @payload = JSON.parse(JSON.generate(payload.respond_to?(:to_unsafe_h) ? payload.to_unsafe_h : payload || {}))
      @errors = []
      @key_map = {}
      @counts = Hash.new(0)
    end

    def call
      raise Wayfinding::Invalid.one('community', 'tour_disabled', 'this property has no Self-Guided Tour') unless Connect::ProductState.tour?(@community)

      parse!
      raise Wayfinding::Invalid.new(@errors) if @errors.any?

      Wayfinding::VersionBump.suspend do
        ApplicationRecord.transaction do
          @tour = Tour.lock.find((@community.community_tour || @community.create_tour).id)
          check_version!
          validate!
          raise Wayfinding::Invalid.new(@errors) if @errors.any?

          apply!
          finalize!
        end
      end
      Result.new(tour: @tour, version: @tour.tour_setup_version, key_map: @key_map, counts: @counts)
    end

    private

      def err(path, code, message)
        @errors << { path: path.to_s, code: code.to_s, message: message }
      end

      def integer(value)
        Integer(value.to_s, 10)
      rescue ArgumentError, TypeError
        nil
      end

      def parse!
        @base_version = integer(@payload['base_version'])
        err('base_version', 'required', 'base_version is required') if @base_version.nil?
        stops = @payload['stops'].is_a?(Hash) ? @payload['stops'] : {}
        @add = list(stops['add'])
        @remove = list(stops['remove'])
        @visibility = list(stops['visibility'])
        @order = list(stops['order'])
        @duration = list(stops['duration'])
        elevators = @payload['elevators'].is_a?(Hash) ? @payload['elevators'] : {}
        @delete_elevators = list(elevators['delete'])
        total = [@add, @remove, @visibility, @order, @duration, @delete_elevators].sum(&:size)
        err('stops', 'too_many', "at most #{MAX_OPS} operations per save") if total > MAX_OPS
      end

      def list(value)
        value.is_a?(Array) ? value : []
      end

      def check_version!
        current = @tour.tour_setup_version.to_i
        return if current == @base_version

        raise Wayfinding::StaleVersion.new(base_version: @base_version, current_version: current, changed_at: @tour.updated_at)
      end

      def tour_stop_ids
        @tour_stop_ids ||= TourStop.where(tour_id: @tour.id).pluck(:id).to_set
      end

      def validate!
        @temp_keys = {}
        @add.each_with_index do |row, i|
          path = "stops.add[#{i}]"
          next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          key = row['temp_key'].to_s
          if key.blank? || key =~ /\A\d+\z/ || @temp_keys.key?(key)
            err("#{path}.temp_key", 'invalid', 'temp_key must be a unique non-numeric string')
          else
            @temp_keys[key] = i
          end
          type = row['stop_type'].to_s
          err("#{path}.stop_type", 'invalid', 'stop_type must be unit or amenity') unless TourStops::Membership::STOP_TYPES.include?(type)
          id = integer(row['stop_id'])
          scope = type == 'unit' ? @community.units : @community.amenities
          err("#{path}.stop_id", 'unknown_record', 'no such record in this property') if id.nil? || !scope.where(id: id).exists?
          validate_duration("#{path}.duration_minutes", row['duration_minutes'])
        end
        @remove.each_with_index do |ref, i|
          id = integer(ref.is_a?(Hash) ? ref['id'] : ref)
          err("stops.remove[#{i}]", 'unknown_stop', 'no such stop in this tour') if id.nil? || !tour_stop_ids.include?(id)
        end
        @visibility.each_with_index do |row, i|
          path = "stops.visibility[#{i}]"
          next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          id = integer(row['id'])
          err("#{path}.id", 'unknown_stop', 'no such stop in this tour') if id.nil? || !tour_stop_ids.include?(id)
          err("#{path}.visible", 'invalid', 'visible must be true or false') unless [true, false].include?(row['visible'])
        end
        @duration.each_with_index do |row, i|
          path = "stops.duration[#{i}]"
          next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          id = integer(row['id'])
          err("#{path}.id", 'unknown_stop', 'no such stop in this tour') if id.nil? || !tour_stop_ids.include?(id)
          validate_duration("#{path}.duration_minutes", row['duration_minutes'])
        end
        @order.each_with_index do |ref, i|
          next if ref.is_a?(String) && @temp_keys.key?(ref)

          id = integer(ref)
          err("stops.order[#{i}]", 'unknown_stop', 'no such stop in this tour') if id.nil? || !tour_stop_ids.include?(id)
        end
        @delete_elevators.each_with_index do |ref, i|
          id = integer(ref.is_a?(Hash) ? ref['id'] : ref)
          err("elevators.delete[#{i}]", 'unknown_record', 'no such elevator in this property') if id.nil? || !@community.elevators.where(id: id).exists?
        end
      end

      def validate_duration(path, value)
        return if value.nil? || value == ''

        minutes = integer(value)
        err(path, 'invalid', 'duration_minutes must be a whole number from 0 to 999') if minutes.nil? || minutes.negative? || minutes > 999
      end

      def apply!
        @remove.each do |ref|
          id = integer(ref.is_a?(Hash) ? ref['id'] : ref)
          stop = TourStop.find_by(id: id, tour_id: @tour.id)
          next unless stop

          TourStops::Remove.call!(stop)
          @counts[:removed] += 1
        end
        @add.each do |row|
          type = row['stop_type'].to_s
          record = (type == 'unit' ? @community.units : @community.amenities).find(integer(row['stop_id']))
          existing = TourStop.where(tour_id: @tour.id, stop_type: type, stop_id: record.id).order(:id).to_a
          state = TourStops::Membership.turn_on(@tour, record, type, existing)
          stop = state.tour_stop
          stop.update!(display_stop: row['visible'] != false) if row.key?('visible')
          stop.update!(duration_minutes: integer(row['duration_minutes'])) if row.key?('duration_minutes')
          @key_map[row['temp_key'].to_s] = stop.id
          @counts[:added] += 1
        end
        @visibility.each do |row|
          stop = TourStop.find_by(id: integer(row['id']), tour_id: @tour.id)
          next unless stop && stop.display_stop != row['visible']

          stop.update!(display_stop: row['visible'])
          @counts[:visibility] += 1
        end
        @duration.each do |row|
          stop = TourStop.find_by(id: integer(row['id']), tour_id: @tour.id)
          next unless stop

          stop.update!(duration_minutes: integer(row['duration_minutes']))
          @counts[:duration] += 1
        end
        apply_order
        @delete_elevators.each do |ref|
          elevator = @community.elevators.find_by(id: integer(ref.is_a?(Hash) ? ref['id'] : ref))
          next unless elevator

          elevator.destroy!
          @counts[:elevators_deleted] += 1
        end
      end

      # The given order first (temp keys resolved), then any stop not listed,
      # in its old order; `sort` is written 1..n only where it changes.
      def apply_order
        return if @order.empty?

        listed = @order.map { |ref| ref.is_a?(String) && @key_map.key?(ref) ? @key_map[ref] : integer(ref) }.compact.uniq
        remaining = TourStop.where(tour_id: @tour.id).where.not(id: listed).order(Arel.sql('sort ASC NULLS LAST, id ASC')).pluck(:id)
        (listed + remaining).each_with_index do |id, index|
          position = index + 1
          @counts[:reordered] += TourStop.where(id: id, tour_id: @tour.id).where.not(sort: position).update_all(sort: position)
        end
      end

      def finalize!
        updated = Tour.where(id: @tour.id, tour_setup_version: @base_version).update_all('tour_setup_version = tour_setup_version + 1, updated_at = NOW()')
        raise Wayfinding::StaleVersion.new(base_version: @base_version, current_version: Tour.where(id: @tour.id).pick(:tour_setup_version)) unless updated == 1

        @tour.reload
        PaperTrail::Version.create!(
          item_type: 'Tour', item_id: @tour.id, event: 'tour_setup_save', whodunnit: @user&.id&.to_s,
          community_id: @community.id, company_id: @community.company_id,
          object: { version: @tour.tour_setup_version, counts: @counts }.to_json
        )
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.warn("[TourSetup::Save] audit row not written: #{e.message}")
      end
  end
end
