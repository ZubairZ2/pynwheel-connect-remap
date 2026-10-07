# frozen_string_literal: true

module Wayfinding
  # One Connect save of one level's wayfinding graph, applied in one
  # transaction: nodes, edges, stop links, pins and additional stops. This is
  # the only writer of the new hallway columns and tables; the legacy editor
  # keeps its own per-click actions untouched.
  #
  #   Wayfinding::GraphSave.call(level: floorplate, community:, user:, payload: params.to_unsafe_h)
  #
  # Rules enforced here, in order:
  #   1. The level row is locked and `base_version` compared with its
  #      `wayfinding_version` (a stale editor gets `StaleVersion`, nothing is
  #      written).
  #   2. A Detect Hallways run (`origin: 'detect'`) with a `request_id` already
  #      recorded is replayed from `hallway_detection_runs.result` (no second
  #      application).
  #   3. The whole payload is validated before the first write; any problem
  #      raises `Invalid` with per-item errors and rolls back.
  #   4. Detect may only add: it merges proposals onto existing nodes within
  #      a tolerance, skips what matches a user-deletion tombstone, and never
  #      moves or deletes a stored row.
  #   5. Edges: a confirmed row is mirrored into `next_points` on the
  #      lower-id node unless the pair is already adjacent on either side; a
  #      pending row never is. Deleting an edge removes the id from both
  #      sides, deletes the row and writes a tombstone. Deleting a node removes
  #      it from every `next_points` on the level, writes a tombstone and lets
  #      the foreign keys take its rows.
  #   6. Pins and stops reuse the columns and callbacks the legacy actions
  #      write (`PinWriter`, `StopWriter`).
  #   7. Exactly one `selected` node is left on the level (what
  #      `make_sure_one_selected_hallway` guarantees the legacy page), the
  #      version moves by one, and a PaperTrail summary row is written.
  #
  # Coordinates in the payload are in storage units: for `raster` hallways and
  # the legacy icon records (elevators, entry points, doors, the tour start)
  # the icon's top-left in floor-image pixels; for `wayfinding_stops` the
  # marker's centre; for `svg` rows the viewBox point itself.
  class GraphSave
    ORIGINS = %w[edit detect].freeze
    MAX_NODE_OPS = 2000
    MAX_EDGE_OPS = 4000
    MAX_LINK_OPS = 2000
    MAX_PIN_OPS = 2000
    MAX_STOP_OPS = 500
    DETECT_FORBIDDEN = [
      %w[nodes move], %w[nodes confirm], %w[nodes delete], %w[edges delete], %w[edges reshape],
      %w[links detach], %w[links clear], %w[stops update], %w[stops delete]
    ].freeze

    AUDIT_EVENTS = %w[wayfinding_save wayfinding_detect wayfinding_reproject wayfinding_detect_undo].freeze

    Result = Struct.new(:level, :version, :key_map, :skipped, :replayed, :run, :counts, keyword_init: true)

    attr_reader :level, :community, :user, :payload, :errors, :key_map, :skipped, :counts

    def self.call(**options)
      new(**options).call
    end

    def initialize(level:, community:, user:, payload:)
      @level = level
      @community = community
      @user = user
      @payload = normalise(payload)
      @errors = []
      @key_map = {}
      @skipped = []
      @counts = Hash.new(0)
      @dirty_nodes = {}
      @reconfirmed = []
    end

    def call
      parse!
      raise Invalid.new(errors) if errors.any?

      replayed = nil
      VersionBump.suspend do
        ApplicationRecord.transaction do
          @level = level.class.lock.find(level.id)
          if detect? && (run = HallwayDetectionRun.find_by(client_request_id: @request_id))
            replayed = replay(run)
            raise ActiveRecord::Rollback
          end
          check_version!
          load_graph!
          validate!
          raise Invalid.new(errors) if errors.any?

          apply!
          finalize!
        end
      end
      return replayed if replayed

      Result.new(level: level, version: level.wayfinding_version, key_map: key_map, skipped: skipped, replayed: false, run: @run, counts: counts)
    end

    private

      # ── payload ──────────────────────────────────────────────────────────

      def normalise(raw)
        raw = raw.to_unsafe_h if raw.respond_to?(:to_unsafe_h)
        raw = raw.to_h if raw.respond_to?(:to_h) && !raw.is_a?(Hash)
        JSON.parse(JSON.generate(raw || {}))
      end

      def detect?
        @origin == 'detect'
      end

      def parse!
        @origin = (payload['origin'].presence || 'edit').to_s
        err('origin', 'invalid', "origin must be one of #{ORIGINS.join(', ')}") unless ORIGINS.include?(@origin)
        @space = (payload['space'].presence || 'raster').to_s
        err('space', 'invalid', 'space must be raster or svg') unless Hallway::SPACES.include?(@space)
        @request_id = payload['request_id'].to_s.strip.presence
        err('request_id', 'required', 'request_id is required for a detect run') if detect? && @request_id.nil?
        err('request_id', 'too_long', 'request_id is too long') if @request_id && @request_id.length > 64
        @base_version = integer(payload['base_version'])
        err('base_version', 'required', 'base_version is required') if @base_version.nil?
        @scope = payload['scope'].presence
        @detector_source = payload['detector_source'].presence

        @nodes = section('nodes', %w[add move confirm delete], MAX_NODE_OPS)
        @edges = section('edges', %w[add reshape delete], MAX_EDGE_OPS)
        @links = section('links', %w[set detach clear], MAX_LINK_OPS)
        @pins = section('pins', %w[units amenities elevators building_starting_points doors], MAX_PIN_OPS)
        @tour_start = payload.dig('pins', 'tour_start').is_a?(Hash) ? payload.dig('pins', 'tour_start') : nil
        @stops = section('stops', %w[create update delete], MAX_STOP_OPS)

        if detect?
          DETECT_FORBIDDEN.each do |group, op|
            list = instance_variable_get("@#{group}")[op]
            err("#{group}.#{op}", 'detect_may_only_add', 'a Detect Hallways run may only add nodes, edges and links') if list.any?
          end
          err('pins', 'detect_may_only_add', 'a Detect Hallways run may not move pins') if @pins.values.any?(&:any?) || @tour_start
        end
      end

      def section(name, keys, cap)
        raw = payload[name].is_a?(Hash) ? payload[name] : {}
        total = 0
        keys.index_with do |key|
          list = raw[key]
          list = [] unless list.is_a?(Array)
          total += list.size
          list
        end.tap do
          err(name, 'too_many', "at most #{cap} #{name} operations per save") if total > cap
        end
      end

      def err(path, code, message)
        errors << { path: path.to_s, code: code.to_s, message: message }
      end

      def integer(value)
        return nil if value.nil? || value == ''
        return value if value.is_a?(Integer)

        Integer(value.to_s, 10)
      rescue ArgumentError, TypeError
        nil
      end

      def number(value)
        return nil if value.nil? || value == ''

        number = Float(value)
        number.finite? ? number : nil
      rescue ArgumentError, TypeError
        nil
      end

      def temp_key?(ref)
        ref.is_a?(String) && ref !~ /\A\d+\z/
      end

      # ── versioning ───────────────────────────────────────────────────────

      def check_version!
        current = level.wayfinding_version.to_i
        return if current == @base_version

        audit = PaperTrail::Version.where(item_type: level_type, item_id: level.id, event: AUDIT_EVENTS).order(:id).last
        changed_by = audit&.whodunnit.presence && User.find_by(id: audit.whodunnit)&.name
        raise StaleVersion.new(base_version: @base_version, current_version: current, changed_by: changed_by, changed_at: audit&.created_at || level.updated_at)
      end

      # ── graph in memory ──────────────────────────────────────────────────

      def load_graph!
        @nodes_by_id = Hallway.on_level(level).to_a.index_by(&:id)
        @edge_rows = HallwayEdge.on_level(level).to_a.index_by(&:pair)
        @attachments = HallwayAttachment.on_level(level).to_a.index_by { |row| [row.attachable_type, row.attachable_id] }
        @tombstones = HallwaySuppression.on_level(level).to_a
        @width = level.respond_to?(:width) ? level.width.to_f : 0.0
        @height = level.respond_to?(:height) ? level.height.to_f : 0.0
        svg = level.respond_to?(:svg_metadata) && level.svg_metadata.is_a?(Hash) ? level.svg_metadata : {}
        svg_diag = Math.hypot(svg['width'].to_f, svg['height'].to_f)
        @tolerance = Suppressions.tolerance(@space, svg_diag.positive? ? svg_diag : nil)
        @pending_adds = []
      end

      def node(id)
        @nodes_by_id[id.to_i]
      end

      def level_type
        level.class.base_class.name
      end

      def level_floors
        @level_floors ||= begin
          level.respond_to?(:floors) && level.try(:range).present? ? level.floors : []
        rescue StandardError
          []
        end
      end

      # ── validation ───────────────────────────────────────────────────────

      def validate!
        @deleted_ids = @nodes['delete'].map { |v| integer(v) }.compact.to_set
        @temp_keys = {}
        @nodes['add'].each_with_index do |row, i|
          path = "nodes.add[#{i}]"
          unless row.is_a?(Hash)
            err(path, 'invalid', 'must be an object')
            next
          end
          key = row['temp_key'].to_s
          if key.blank? || !temp_key?(key) || @temp_keys.key?(key)
            err("#{path}.temp_key", 'invalid', 'temp_key must be a unique non-numeric string')
          else
            @temp_keys[key] = i
          end
          validate_point(path, row['x'], row['y'])
          err("#{path}.source", 'invalid', 'unknown source') if row['source'].present? && !Hallway::SOURCES.include?(row['source'].to_s)
          err("#{path}.review", 'invalid', 'unknown review status') if row['review'].present? && !Hallway::REVIEW_STATUSES.include?(row['review'].to_s)
        end

        %w[move confirm delete].each do |op|
          @nodes[op].each_with_index do |row, i|
            id = integer(op == 'delete' ? row : row.is_a?(Hash) ? row['id'] : row)
            path = "nodes.#{op}[#{i}]"
            if id.nil? || node(id).nil?
              err(path, 'unknown_node', 'no such hallway on this level')
              next
            end
            if op == 'move'
              err(path, 'deleted', 'a node cannot be moved and deleted in one save') if @deleted_ids.include?(id)
              validate_point(path, row['x'], row['y'])
              err("#{path}.space", 'space_mismatch', 'the node is drawn in another space') if node(id).space != @space && !row['space'].nil?
            end
          end
        end

        @edges['add'].each_with_index do |row, i|
          path = "edges.add[#{i}]"
          next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          validate_ref("#{path}.a", row['a'])
          validate_ref("#{path}.b", row['b'])
          err(path, 'self_loop', 'an edge cannot join a node to itself') if row['a'].to_s == row['b'].to_s
          err("#{path}.kind", 'invalid', 'unknown edge kind') if row['kind'].present? && !HallwayEdge::KINDS.include?(row['kind'].to_s)
          validate_points("#{path}.points", row['points'])
        end
        @edges['reshape'].each_with_index do |row, i|
          path = "edges.reshape[#{i}]"
          next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          a = integer(row['a'])
          b = integer(row['b'])
          err(path, 'unknown_edge', 'no such edge on this level') if a.nil? || b.nil? || node(a).nil? || node(b).nil? || !adjacent?(node(a), node(b))
          validate_points("#{path}.points", row['points'])
        end
        @edges['delete'].each_with_index do |row, i|
          path = "edges.delete[#{i}]"
          next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          a = integer(row['a'])
          b = integer(row['b'])
          err(path, 'unknown_node', 'no such hallway on this level') if a.nil? || b.nil? || node(a).nil? || node(b).nil?
        end

        @links['set'].each_with_index do |row, i|
          path = "links.set[#{i}]"
          next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

          validate_attachable(path, row)
          validate_ref("#{path}.hallway", row['hallway'])
          if row['anchor'].present?
            anchor = row['anchor'].is_a?(Hash) ? row['anchor'] : {}
            err("#{path}.anchor", 'invalid', 'anchor must hold finite x and y') if number(anchor['x']).nil? || number(anchor['y']).nil?
          end
        end
        %w[detach clear].each do |op|
          @links[op].each_with_index do |row, i|
            path = "links.#{op}[#{i}]"
            next err(path, 'invalid', 'must be an object') unless row.is_a?(Hash)

            validate_attachable(path, row)
          end
        end

        PinWriter.new(self).validate!
        StopWriter.new(self).validate!
      end

      def validate_point(path, x, y)
        px = number(x)
        py = number(y)
        return err(path, 'invalid_point', 'x and y must be finite numbers') if px.nil? || py.nil?
        return unless @space == 'raster'

        err(path, 'out_of_bounds', 'the point lies outside the floor image') if px.negative? || py.negative? || (@width.positive? && px > @width) || (@height.positive? && py > @height)
      end

      def validate_points(path, points)
        return if points.nil?
        return err(path, 'invalid', 'points must be a list') unless points.is_a?(Array)
        return err(path, 'too_many', "at most #{HallwayEdge::MAX_POINTS} points") if points.size > HallwayEdge::MAX_POINTS

        bad = points.any? { |p| !(p.is_a?(Array) && p.size == 2 && number(p[0]) && number(p[1])) }
        err(path, 'invalid', 'points must be [x, y] pairs of finite numbers') if bad
      end

      def validate_ref(path, ref)
        if temp_key?(ref)
          err(path, 'unknown_node', 'no such temp key in nodes.add') unless @temp_keys.key?(ref)
        else
          id = integer(ref)
          if id.nil? || node(id).nil?
            err(path, 'unknown_node', 'no such hallway on this level')
          elsif @deleted_ids.include?(id)
            err(path, 'deleted', 'the node is deleted in this save')
          end
        end
      end

      ATTACHABLE_SCOPES = {
        'Unit' => ->(community) { community.units },
        'Amenity' => ->(community) { community.amenities },
        'Door' => ->(community) { community.doors },
        'Elevator' => ->(community) { community.elevators },
        'BuildingStartingPoint' => ->(community) { BuildingStartingPoint.where(community_id: community.id) },
        'Tour' => ->(community) { Tour.where(community_id: community.id, tour_user_id: nil) },
        'WayfindingStop' => ->(community) { community.wayfinding_stops }
      }.freeze

      def validate_attachable(path, row)
        type = row['attachable_type'].to_s
        id = integer(row['attachable_id'])
        scope = ATTACHABLE_SCOPES[type]
        return err("#{path}.attachable_type", 'invalid', 'unknown attachable type') if scope.nil?
        return err("#{path}.attachable_id", 'unknown_attachable', 'no such record in this property') if id.nil? || !scope.call(community).where(id: id).exists?
      end

      # ── application ──────────────────────────────────────────────────────

      def apply!
        @run = create_run if detect?
        apply_edge_deletes
        apply_node_deletes
        apply_node_adds
        apply_node_moves
        apply_edge_adds
        apply_edge_reshapes
        rederive_edges_of_reconfirmed_nodes
        flush_nodes!
        apply_links
        PinWriter.new(self).apply!
        StopWriter.new(self).apply!
      end

      def create_run
        HallwayDetectionRun.create!(
          community: community, parent: level, client_request_id: @request_id, status: 'applied',
          scope: @scope, detector_source: @detector_source, space: @space, triggered_by_user_id: user&.id
        )
      end

      def adjacent?(a, b)
        Array(a.next_points).include?(b.id) || Array(b.next_points).include?(a.id) || @edge_rows.key?(HallwayEdge.canonical(a.id, b.id))
      end

      def mark_dirty(hallway)
        @dirty_nodes[hallway.id] = hallway
      end

      def remove_adjacency(a, b)
        [[a, b], [b, a]].each do |from, to|
          next unless Array(from.next_points).include?(to.id)

          from.next_points = Array(from.next_points) - [to.id]
          mark_dirty(from)
        end
      end

      def mirror_adjacency(a, b)
        return if Array(a.next_points).include?(b.id) || Array(b.next_points).include?(a.id)

        lo, hi = [a, b].sort_by(&:id)
        lo.next_points = (Array(lo.next_points) + [hi.id]).uniq
        mark_dirty(lo)
      end

      def apply_edge_deletes
        @edges['delete'].each do |row|
          a = node(integer(row['a']))
          b = node(integer(row['b']))
          next if a.nil? || b.nil?

          edge_row = @edge_rows.delete(HallwayEdge.canonical(a.id, b.id))
          was_adjacent = adjacent?(a, b) || edge_row
          remove_adjacency(a, b)
          edge_row&.destroy!
          next unless was_adjacent
          next if @deleted_ids.include?(a.id) || @deleted_ids.include?(b.id)

          Suppressions.record_edge!(a, b, edge_row: edge_row, user: user)
          counts[:edges_deleted] += 1
        end
      end

      def apply_node_deletes
        @deleted_ids.each do |id|
          hallway = node(id)
          next unless hallway

          @nodes_by_id.each_value do |other|
            next if other.id == id || !Array(other.next_points).include?(id)

            other.next_points = Array(other.next_points) - [id]
            mark_dirty(other)
          end
          @edge_rows.delete_if { |pair, _row| pair.include?(id) }
          @attachments.delete_if { |_key, row| row.hallway_id == id }
          Suppressions.record_node!(hallway, user: user)
          @dirty_nodes.delete(id)
          hallway.destroy!
          @nodes_by_id.delete(id)
          counts[:nodes_deleted] += 1
        end
      end

      def apply_node_adds
        @nodes['add'].each do |row|
          key = row['temp_key'].to_s
          x = number(row['x'])
          y = number(row['y'])
          existing = @nodes_by_id.values.find { |h| h.space == @space && Suppressions.near?(h.x_plot, h.y_plot, x, y, detect? ? @tolerance : 1.0) }
          if existing
            key_map[key] = existing.id
            skipped << { 'temp_key' => key, 'reason' => 'merged', 'id' => existing.id }
            counts[:nodes_merged] += 1
            next
          end
          matches = Suppressions.matching_nodes(@tombstones, x, y, @space, @tolerance)
          if matches.any?
            if detect?
              key_map[key] = nil
              skipped << { 'temp_key' => key, 'reason' => 'suppressed' }
              counts[:nodes_skipped] += 1
              next
            end
            HallwaySuppression.where(id: matches.map(&:id)).delete_all
            @tombstones -= matches
          end
          hallway = Hallway.create!(
            parent: level, community_id: community.id, x_plot: x, y_plot: y, space: @space, selected: false, next_points: [],
            source: detect? ? (row['source'].presence || 'inferred') : (row['source'].presence || 'manual'),
            review_status: detect? ? (row['review'].presence || 'pending') : 'confirmed',
            confidence: number(row['confidence']), detection_run_id: @run&.id, created_by_user_id: user&.id,
            confirmed_at: (detect? && row['review'].to_s != 'confirmed') ? nil : Time.current
          )
          @nodes_by_id[hallway.id] = hallway
          key_map[key] = hallway.id
          counts[:nodes_added] += 1
        end
      end

      def apply_node_moves
        @nodes['move'].each do |row|
          hallway = node(integer(row['id']))
          next unless hallway

          hallway.x_plot = number(row['x'])
          hallway.y_plot = number(row['y'])
          confirm_node(hallway)
          hallway.save!
          counts[:nodes_moved] += 1
        end
        @nodes['confirm'].each do |ref|
          hallway = node(integer(ref.is_a?(Hash) ? ref['id'] : ref))
          next unless hallway && hallway.pending?

          confirm_node(hallway)
          hallway.save!
          counts[:nodes_confirmed] += 1
        end
      end

      def confirm_node(hallway)
        return unless hallway.pending?

        hallway.review_status = 'confirmed'
        hallway.confirmed_at = Time.current
        @reconfirmed << hallway.id
      end

      def resolve(ref)
        if temp_key?(ref)
          return nil unless key_map.key?(ref) && key_map[ref]

          node(key_map[ref])
        else
          node(integer(ref))
        end
      end

      def apply_edge_adds
        @edges['add'].each_with_index do |row, i|
          a = resolve(row['a'])
          b = resolve(row['b'])
          if a.nil? || b.nil? || a.id == b.id
            skipped << { 'edge' => i, 'reason' => 'endpoint_skipped' }
            counts[:edges_skipped] += 1
            next
          end
          pair = HallwayEdge.canonical(a.id, b.id)
          if adjacent?(a, b)
            skipped << { 'edge' => i, 'reason' => 'duplicate', 'pair' => pair }
            counts[:edges_skipped] += 1
            next
          end
          matches = Suppressions.matching_edges(@tombstones, a, b, @space, @tolerance)
          if matches.any?
            if detect?
              skipped << { 'edge' => i, 'reason' => 'suppressed', 'pair' => pair }
              counts[:edges_skipped] += 1
              next
            end
            HallwaySuppression.where(id: matches.map(&:id)).delete_all
            @tombstones -= matches
          end
          lo, hi = [a, b].sort_by(&:id)
          points = Array(row['points']).map { |p| [number(p[0]), number(p[1])] }
          points = points.reverse if lo.id != integer_or_mapped(row['a'])
          review = lo.pending? || hi.pending? ? 'pending' : 'confirmed'
          edge = HallwayEdge.create!(
            from_hallway: lo, to_hallway: hi, parent: level, community_id: community.id,
            kind: row['kind'].presence || (detect? ? 'inferred' : 'manual'), path_points: points, review_status: review,
            auto_generated: detect?, detection_run_id: @run&.id, space: @space, created_by_user_id: user&.id
          )
          @edge_rows[pair] = edge
          mirror_adjacency(a, b) if review == 'confirmed'
          counts[:edges_added] += 1
        end
      end

      def integer_or_mapped(ref)
        temp_key?(ref) ? key_map[ref] : integer(ref)
      end

      def apply_edge_reshapes
        @edges['reshape'].each do |row|
          a = node(integer(row['a']))
          b = node(integer(row['b']))
          next if a.nil? || b.nil?

          lo, hi = [a, b].sort_by(&:id)
          pair = [lo.id, hi.id]
          edge = @edge_rows[pair] || HallwayEdge.create!(from_hallway: lo, to_hallway: hi, parent: level, community_id: community.id, kind: 'manual', review_status: 'confirmed', space: @space, created_by_user_id: user&.id)
          points = Array(row['points']).map { |p| [number(p[0]), number(p[1])] }
          points = points.reverse if lo.id != a.id
          edge.update!(path_points: points)
          @edge_rows[pair] = edge
          counts[:edges_reshaped] += 1
        end
      end

      def rederive_edges_of_reconfirmed_nodes
        return if @reconfirmed.empty?

        @edge_rows.each_value do |edge|
          next unless edge.pending? && (@reconfirmed.include?(edge.from_hallway_id) || @reconfirmed.include?(edge.to_hallway_id))

          a = node(edge.from_hallway_id)
          b = node(edge.to_hallway_id)
          next if a.nil? || b.nil? || a.pending? || b.pending?

          edge.update!(review_status: 'confirmed')
          mirror_adjacency(a, b)
          counts[:edges_confirmed] += 1
        end
      end

      def flush_nodes!
        @dirty_nodes.each_value { |hallway| hallway.save! if hallway.changed? }
        @dirty_nodes.clear
      end

      def apply_links
        @links['set'].each do |row|
          hallway = resolve(row['hallway'])
          next unless hallway

          anchor = row['anchor'].is_a?(Hash) ? row['anchor'] : {}
          upsert_attachment(row, mode: 'explicit', hallway_id: hallway.id, anchor_x: number(anchor['x']), anchor_y: number(anchor['y']))
          counts[:links_set] += 1
        end
        @links['detach'].each do |row|
          upsert_attachment(row, mode: 'detached', hallway_id: nil, anchor_x: nil, anchor_y: nil)
          counts[:links_detached] += 1
        end
        @links['clear'].each do |row|
          key = [row['attachable_type'].to_s, integer(row['attachable_id'])]
          existing = @attachments.delete(key)
          existing&.destroy!
          counts[:links_cleared] += 1
        end
      end

      def upsert_attachment(row, mode:, hallway_id:, anchor_x:, anchor_y:)
        key = [row['attachable_type'].to_s, integer(row['attachable_id'])]
        attachment = @attachments[key] || HallwayAttachment.new(attachable_type: key[0], attachable_id: key[1], parent: level, community_id: community.id)
        attachment.assign_attributes(mode: mode, hallway_id: hallway_id, anchor_x: anchor_x, anchor_y: anchor_y, space: @space, created_by_user_id: user&.id)
        attachment.save!
        @attachments[key] = attachment
      end

      # ── finish ───────────────────────────────────────────────────────────

      def finalize!
        ensure_one_selected!
        updated = level.class.where(id: level.id, wayfinding_version: @base_version).update_all('wayfinding_version = wayfinding_version + 1, updated_at = NOW()')
        raise StaleVersion.new(base_version: @base_version, current_version: level.class.where(id: level.id).pick(:wayfinding_version)) unless updated == 1

        level.reload
        if @run
          @run.update!(
            nodes_added: counts[:nodes_added], edges_added: counts[:edges_added],
            nodes_skipped: counts[:nodes_skipped] + counts[:nodes_merged], edges_skipped: counts[:edges_skipped],
            result: { 'key_map' => key_map, 'skipped' => skipped, 'version' => level.wayfinding_version }
          )
        end
        write_audit_row
      end

      # The legacy page chains its next click from the one `selected` node;
      # keep exactly one among the rows it can see (routable), as
      # ApplicationController#make_sure_one_selected_hallway does.
      def ensure_one_selected!
        rows = Hallway.on_level(level).routable.order(:id).pluck(:id, :selected)
        return if rows.empty?

        selected = rows.select { |_, s| s }.map(&:first)
        return if selected.size == 1

        keep = selected.max || rows.last.first
        Hallway.where(id: selected - [keep]).update_all(selected: false) if selected.size > 1
        Hallway.where(id: keep).update_all(selected: true)
      end

      # One summary row per save on the level itself (the pattern of
      # FloorplatesController#update), distinguishable by its event.
      def write_audit_row
        PaperTrail::Version.create!(
          item_type: level_type, item_id: level.id, event: detect? ? 'wayfinding_detect' : 'wayfinding_save',
          whodunnit: user&.id&.to_s, community_id: community.id, company_id: community.company_id,
          object: { level: "#{level_type}:#{level.id}", version: level.wayfinding_version, origin: @origin, request_id: @request_id, counts: counts }.to_json
        )
      rescue StandardError => e
        Rails.logger.warn("[Wayfinding::GraphSave] audit row not written for #{level_type}:#{level.id}: #{e.class}: #{e.message}")
      end

      def replay(run)
        result = run.result.is_a?(Hash) ? run.result : {}
        Result.new(level: level, version: level.wayfinding_version, key_map: result['key_map'] || {}, skipped: result['skipped'] || [], replayed: true, run: run, counts: counts)
      end

      public

      # Shared with the pin and stop writers.
      def space
        @space
      end

      def pins
        @pins
      end

      def tour_start
        @tour_start
      end

      def stops
        @stops
      end

      def record_error(path, code, message)
        err(path, code, message)
      end

      def resolve_node(ref)
        resolve(ref)
      end

      def coerce_number(value)
        number(value)
      end

      def coerce_integer(value)
        integer(value)
      end

      def add_skipped(entry)
        skipped << entry
      end

      def map_key(key, value)
        key_map[key] = value
      end

      def floors_of_level
        level_floors
      end
  end
end
