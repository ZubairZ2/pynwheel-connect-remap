# frozen_string_literal: true

module Wayfinding
  # Routes over `GraphBuilder#build`: from one place to another, or the whole
  # tour (start → visible stops in tour order → back). Dijkstra with a binary
  # heap over the per-floor copies; the answer is a list of legs (one per
  # floor walked, with the centre-pixel points along each path's polyline) and
  # the floor / building transitions between them, plus the steps `Timing`
  # phrases. Errors use the taxonomy of the Connect router so the preview and
  # the Tour App say the same thing.
  class RouteService
    Result = Struct.new(:ok, :from, :to, :legs, :steps, :length_px, :length_ft, :duration_s, :warnings, :error, :graph, keyword_init: true)
    Leg = Struct.new(:index, :kind, :level_key, :floor, :building, :from, :to, :length_px, :points, :nodes, :via, :floor_from, :floor_to, :name, keyword_init: true)

    ERRORS = {
      unknown_endpoint: 'That place is not on the map.',
      same_endpoint: 'Pick two different places.',
      ambiguous_floor: 'Say which floor to start on.',
      not_linked: '%{name} is not connected to a path on %{where}.',
      no_path: 'No path connects those two places.',
      blocked: 'Every path between those places is cut by a blocker%{where}.',
      no_step_free: 'No step-free route: every way between those floors uses stairs.',
      no_vertical_link: 'Nothing links those floors. Add an elevator or stairs that serves both.',
      no_building_link: 'Nothing links building %{a} to building %{b}. Add an entry or exit point to each.',
      no_start: 'The tour has no starting point on the map.'
    }.freeze

    def initialize(community, from: nil, to: nil, step_free: false, avoid_blockers: true, from_floor: nil, to_floor: nil, graph: nil)
      @community = community
      @from = from
      @to = to
      @step_free = step_free
      @avoid_blockers = avoid_blockers
      @from_floor = from_floor
      @to_floor = to_floor
      @graph = graph
    end

    def graph
      @graph ||= GraphBuilder.new(@community, step_free: @step_free, avoid_blockers: @avoid_blockers).build
    end

    def call
      a = resolve(@from, @from_floor)
      b = resolve(@to, @to_floor)
      return failure(:unknown_endpoint, from: @from, to: @to) if a.is_a?(Symbol) && a == :unknown || b.is_a?(Symbol) && b == :unknown
      return failure(:ambiguous_floor, from: @from, to: @to) if a == :ambiguous || b == :ambiguous
      return failure(:same_endpoint, from: @from, to: @to) if a == b

      route_between(a, b, from: @from, to: @to)
    end

    # The whole tour: start → every visible stop in tour order → start.
    def tour
      start = graph.nodes.keys.find { |k| k.start_with?('tour_start:') }
      return failure(:no_start, from: nil, to: nil) unless start

      stops = ordered_tour_stops
      sequence = [copy_of(graph.nodes[start], nil)] + stops.map { |row| row[:copy] } + [copy_of(graph.nodes[start], nil)]
      legs = []
      steps = []
      warnings = []
      length = 0.0
      duration = 0.0
      sequence.each_cons(2).with_index do |(from_copy, to_copy), i|
        partial = route_between(from_copy, to_copy, from: graph.node(from_copy)[:node].key, to: graph.node(to_copy)[:node].key)
        unless partial.ok
          warnings << "#{partial.error[:message]} (#{graph.node(from_copy)[:node].name} → #{graph.node(to_copy)[:node].name})"
          next
        end
        offset = legs.size
        partial.legs.each { |leg| leg.index += offset }
        legs.concat(partial.legs)
        partial.steps.each { |step| step[:leg] += offset }
        steps.concat(partial.steps)
        length += partial.length_px
        duration += partial.duration_s.to_f
        stop_row = stops[i]
        next unless stop_row

        dwell = stop_row[:tour_stop].duration_minutes.to_i * 60
        steps.last[:dwell_s] = dwell if steps.last && steps.last[:kind] == 'arrive'
        duration += dwell
      end
      return failure(:no_path, from: start, to: start, warnings: warnings) if legs.empty?

      Result.new(ok: true, from: start, to: start, legs: legs, steps: steps, length_px: length.round(1), length_ft: feet(legs), duration_s: duration.round, warnings: warnings, error: nil, graph: graph)
    end

    private

      def failure(code, from:, to:, warnings: [], **params)
        message = format(ERRORS[code], **{ name: '', where: '', a: '', b: '' }.merge(params))
        Result.new(ok: false, from: from, to: to, legs: [], steps: [], length_px: 0, length_ft: nil, duration_s: nil, warnings: warnings, error: { code: code.to_s, message: message, fix: params[:fix] }, graph: graph)
      end

      # "unit:5541" (+ an optional floor) → the copy key the route starts or ends at.
      def resolve(ref, floor)
        instances = graph.instances(ref.to_s)
        return :unknown if instances.empty?

        copy_of(instances, floor)
      end

      # Every per-floor copy of a record across the levels it stands on; one
      # copy answers itself, several need the floor (or the record's own).
      def copy_of(node_or_instances, floor)
        instances = node_or_instances.is_a?(Array) ? node_or_instances : [node_or_instances]
        copies = instances.flat_map do |node|
          graph.level(node.level_key).copies.map { |f| graph.copy_key(node.key, node.level_key, f) }
        end.select { |k| graph.copy_nodes.key?(k) }
        return :unknown if copies.empty?
        return copies.first if copies.size == 1

        if floor.present?
          match = copies.find { |k| graph.copy_nodes[k][:floor] == floor.to_i || graph.level(graph.copy_nodes[k][:level_key]).floors == [floor.to_i] }
          return match || :unknown
        end
        own = instances.select { |node| node.floor }.map { |node| graph.copy_key(node.key, node.level_key, node.floor) }.uniq
        return own.first if own.size == 1 && graph.copy_nodes.key?(own.first)

        :ambiguous
      end

      def ordered_tour_stops
        building_index = graph.buildings.each_with_index.to_h
        rows = graph.tour_stops.select { |ts| ts.display_stop != false && TourStop::LEGACY_STOP_TYPES.include?(ts.stop_type) }
        rows.filter_map do |ts|
          key = { 'unit' => 'unit', 'amenity' => 'amenity', 'elevator' => 'elevator', 'building_starting_point' => 'bsp' }[ts.stop_type]
          node = graph.nodes["#{key}:#{ts.stop_id}"]
          next unless node && node.kind != 'elevator'

          copy = copy_of(node, nil)
          next unless copy.is_a?(String)

          level = graph.level(node.level_key)
          { tour_stop: ts, node: node, copy: copy, building: building_index[node.building] || 0, floor: node.floor || level.floors.first || 0, sort: ts.sort || 1 << 30 }
        end.sort_by { |row| [row[:building], row[:floor], row[:sort], row[:tour_stop].id] }
      end

      def route_between(a, b, from:, to:)
        na = graph.node(a)
        nb = graph.node(b)
        [[na, from], [nb, to]].each do |copy, label|
          node = copy[:node]
          next if node.kind == 'hallway'
          next if copy[:linked]

          return failure(:not_linked, from: from, to: to, name: node.name.to_s, where: place_name(copy))
        end

        found = dijkstra(a, b)
        unless found
          return diagnose(a, b, from, to)
        end

        legs_from_path(found, from, to)
      end

      def place_name(copy)
        level = graph.level(copy[:level_key])
        name = level.kind == 'sitemap' ? 'the property map' : level.record.try(:name).presence || level.key
        copy[:floor] ? "Floor #{copy[:floor]} (#{name})" : name
      end

      def diagnose(a, b, from, to)
        na = graph.node(a)
        nb = graph.node(b)
        if @avoid_blockers && graph.nodes.values.any? { |n| n.kind == 'blocker' }
          open = self.class.new(@community, step_free: @step_free, avoid_blockers: false).route_between_public(a, b, from, to)
          return failure(:blocked, from: from, to: to, where: '') if open.ok
        end
        same_floor = na[:level_key] == nb[:level_key] && na[:floor] == nb[:floor]
        unless same_floor
          ba = na[:node].building
          bb = nb[:node].building
          return failure(:no_building_link, from: from, to: to, a: ba, b: bb) if ba.present? && bb.present? && ba != bb && graph.adjacency.values.flatten.none? { |e| e.kind == 'outdoor' }
          verticals = graph.adjacency.values.flatten.count { |e| %w[elevator stairs ramp].include?(e.kind) }
          return failure(:no_step_free, from: from, to: to) if @step_free && verticals.zero? && graph.nodes.values.any? { |n| n.vertical == 'stairs' }
          return failure(:no_vertical_link, from: from, to: to) if verticals.zero?
          return failure(:no_step_free, from: from, to: to) if @step_free
        end
        failure(:no_path, from: from, to: to)
      end

      public

      def route_between_public(a, b, from, to)
        route_between(a, b, from: from, to: to)
      end

      private

      def dijkstra(source, target)
        dist = Hash.new(Float::INFINITY)
        prev = {}
        via = {}
        dist[source] = 0.0
        heap = MinHeap.new
        heap.push(0.0, source)
        until heap.empty?
          d, u = heap.pop
          next if d > dist[u]
          break if u == target

          graph.adjacency[u].each do |edge|
            alt = d + edge.weight
            next unless alt < dist[edge.to]

            dist[edge.to] = alt
            prev[edge.to] = u
            via[edge.to] = edge
            heap.push(alt, edge.to)
          end
        end
        return nil unless dist[target].finite?

        path = [target]
        path.unshift(prev[path.first]) while prev[path.first]
        { path: path, via: via, length: dist[target] }
      end

      def legs_from_path(found, from, to)
        path = found[:path]
        start = graph.node(path.first)
        legs = []
        leg = new_leg(legs.size, start)
        path.each_cons(2) do |_prev_key, key|
          edge = found[:via][key]
          copy = graph.node(key)
          if %w[walk link].include?(edge.kind)
            line = edge.polyline || [[graph.node(edge.from)[:x], graph.node(edge.from)[:y]], [copy[:x], copy[:y]]]
            line[1..].each { |pt| leg.points << pt } if line.size > 1
            leg.length_px += edge.weight
            leg.nodes << copy[:node].key
            leg.to = copy[:node].key
            next
          end
          legs << leg
          legs << Leg.new(index: legs.size, kind: edge.kind, level_key: nil, floor: nil, building: nil, from: leg.to, to: copy[:node].key, length_px: 0.0,
                          points: [], nodes: [], via: copy[:node].key, floor_from: floor_of(graph.node(edge.from)), floor_to: floor_of(copy), name: edge.name)
          leg = new_leg(legs.size, copy)
        end
        legs << leg
        length = legs.sum(&:length_px)
        duration = Timing.duration(legs, graph)
        steps = Timing.steps(legs, graph)
        Result.new(ok: true, from: from, to: to, legs: legs, steps: steps, length_px: length.round(1), length_ft: feet(legs), duration_s: duration, warnings: [], error: nil, graph: graph)
      end

      def new_leg(index, copy)
        node = copy[:node]
        Leg.new(index: index, kind: 'walk', level_key: copy[:level_key], floor: floor_of(copy), building: node.building, from: node.key, to: node.key,
                length_px: 0.0, points: [[copy[:x], copy[:y]]], nodes: [node.key], via: nil, floor_from: nil, floor_to: nil, name: nil)
      end

      def floor_of(copy)
        copy[:floor] || graph.level(copy[:level_key])&.floors&.first
      end

      def feet(legs)
        total = 0.0
        legs.each do |leg|
          next unless leg.kind == 'walk'

          scale = graph.level(leg.level_key)&.record.try(:scale_ft_per_px)
          return nil if scale.blank? || scale.to_f <= 0

          total += leg.length_px * scale.to_f
        end
        total.round(1)
      end

      # A small binary heap for Dijkstra.
      class MinHeap
        def initialize
          @a = []
        end

        def empty?
          @a.empty?
        end

        def push(priority, value)
          @a << [priority, value]
          i = @a.size - 1
          while i.positive?
            parent = (i - 1) / 2
            break if @a[parent][0] <= @a[i][0]

            @a[parent], @a[i] = @a[i], @a[parent]
            i = parent
          end
        end

        def pop
          top = @a.first
          last = @a.pop
          unless @a.empty?
            @a[0] = last
            i = 0
            loop do
              l = 2 * i + 1
              r = l + 1
              smallest = i
              smallest = l if l < @a.size && @a[l][0] < @a[smallest][0]
              smallest = r if r < @a.size && @a[r][0] < @a[smallest][0]
              break if smallest == i

              @a[smallest], @a[i] = @a[i], @a[smallest]
              i = smallest
            end
          end
          top
        end
      end
  end
end
