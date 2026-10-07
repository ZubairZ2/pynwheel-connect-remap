# frozen_string_literal: true

module Wayfinding
  # One routable graph for a whole property, built from the persisted rows the
  # way Connect's Wayfinding mode (and the legacy `ShortestPath`) read them:
  #
  #   - every level (a Floorplate, or the Sitemap) contributes its routable
  #     hallway nodes and their links; a stacked floorplate (`range` "1-6")
  #     is one layout shared by its floors, so each floor is a copy of the
  #     same nodes and links ("<level>@<floor>");
  #   - plotted units and amenities join the graph at their door when they
  #     have one, else at their pin (the legacy rule), at the nearest routable
  #     node (no distance limit, `ShortestPath#get_*_data`) unless a
  #     `hallway_attachments` row names another node or says "detached";
  #   - elevators (any `kind`) stand on every floor they serve; the copies of
  #     one elevator are linked floor to floor (step-free routes skip stairs
  #     and inaccessible connectors); building entry/exit points, the tour's
  #     own start and entry/exit `wayfinding_stops` are gates, linked between
  #     buildings by one outdoor edge;
  #   - blockers cut the hallway links that pass within their radius.
  #
  # Weights are floor-image pixels; a floor change weighs what the design
  # weighs it in its 760×470 plan (elevator 50 + 10·floors, stairs 90·floors,
  # outdoor 500), scaled to the level's diagonal. Coordinates are centres
  # (legacy icon records are stored top-left; +8 is applied on read).
  # Read-only; nothing is persisted.
  Node = Struct.new(:key, :kind, :record, :level_key, :floor, :building, :x, :y, :name, :anchor, :review, :vertical, :accessible, :served, :attach, :link, :note, :lock_provider, :radius, keyword_init: true)
  Edge = Struct.new(:from, :to, :kind, :weight, :polyline, :name, keyword_init: true)
  LevelInfo = Struct.new(:key, :kind, :record, :floors, :building, :width, :height, :space, :copies, :unit, keyword_init: true)
  # `nodes` holds one Node per logical id (the first level it appears on);
  # `node_levels` every per-level instance (an elevator serving two
  # floorplates attaches to a different hallway on each); `copy_nodes` the
  # per-floor copies the router walks.
  Graph = Struct.new(:community, :levels, :nodes, :node_levels, :copy_nodes, :adjacency, :logical_edges, :vertical, :gates, :tour, :tour_stops, :buildings, :step_free, :avoid_blockers, :warnings, keyword_init: true) do
    def level(key) = levels.find { |l| l.key == key }
    # A per-floor copy is qualified by its level too: an elevator serving two
    # single-floor floorplates stands on both, and the two copies must stay
    # apart so the route between them is an elevator ride, never a walk.
    def copy_key(node_key, level_key, floor) = "#{node_key}@#{level_key}@#{floor}"
    def node(copy_key) = copy_nodes[copy_key]
    def instances(key) = node_levels[key] || []
  end

  class GraphBuilder
    ICON_OFFSET = 8.0
    DESIGN_DIAGONAL = Math.hypot(760, 470)
    LEGACY_ICON_KINDS = %w[hallway door elevator entry tour_start].freeze

    def initialize(community, step_free: false, avoid_blockers: true, include_pending: false)
      @community = community
      @step_free = step_free
      @avoid_blockers = avoid_blockers
      @include_pending = include_pending
      @warnings = []
    end

    def build
      @graph = Graph.new(community: @community, levels: [], nodes: {}, node_levels: {}, copy_nodes: {}, adjacency: Hash.new { |h, k| h[k] = [] },
                         logical_edges: [], vertical: Hash.new { |h, k| h[k] = [] }, gates: [], tour: main_tour, tour_stops: [],
                         buildings: [], step_free: @step_free, avoid_blockers: @avoid_blockers, warnings: @warnings)
      load_rows
      build_levels
      @graph.levels.each { |level| build_level(level) }
      link_vertical
      link_gates
      @graph.tour_stops = tour_stop_rows
      @graph.buildings = buildings
      @graph
    end

    private

      attr_reader :community

      def main_tour
        @main_tour ||= community.community_tour
      end

      def buildings
        @buildings ||= begin
          community.fetch_building_list(main_tour&.building_order)
        rescue StandardError
          []
        end
      end

      def load_rows
        hallway_scope = Hallway.where(community_id: community.id, space: 'raster')
        hallway_scope = hallway_scope.confirmed unless @include_pending
        @hallways = hallway_scope.to_a.group_by { |h| [h.parent_type, h.parent_id] }
        edge_scope = HallwayEdge.where(community_id: community.id, space: 'raster')
        edge_scope = edge_scope.confirmed unless @include_pending
        @edge_rows = edge_scope.to_a.group_by { |e| [e.parent_type, e.parent_id] }
        @attachments = HallwayAttachment.where(community_id: community.id).to_a.group_by { |a| [a.parent_type, a.parent_id] }
        @stops = WayfindingStop.where(community_id: community.id).active.to_a.group_by { |s| [s.map_type, s.map_id] }
        @units = community.units.visible_units.where('x_plot > 0 OR y_plot > 0').to_a
        @amenities = community.amenities.where(amenityable_type: %w[Floorplate Sitemap]).where('x_plot > 0 OR y_plot > 0').to_a
        @doors = community.doors.to_a
        @unit_doors = @doors.select { |d| d.attached_with_type == 'Unit' }.group_by(&:attached_with_id)
        @amenity_doors = @doors.select { |d| d.attached_with_type == 'Amenity' }.group_by(&:attached_with_id)
        @plate_doors = @doors.select { |d| %w[Floorplate Sitemap].include?(d.attached_with_type) }.group_by { |d| [d.attached_with_type, d.attached_with_id] }
        @elevators = community.elevators.to_a
        @bsps = BuildingStartingPoint.where(community_id: community.id).to_a
      end

      def build_levels
        records = community.is_sitemap ? [community.sitemap].compact : community.floorplates.to_a
        records = records.sort_by { |r| [floors_of(r).min || 0, r.id] } unless community.is_sitemap
        @graph.levels = records.map do |record|
          floors = floors_of(record)
          width = record.try(:width).to_f
          height = record.try(:height).to_f
          LevelInfo.new(
            key: level_key(record), kind: record.class.base_class.name.underscore, record: record, floors: floors,
            building: record.try(:building).presence, width: width, height: height, space: 'raster',
            copies: floors.size > 1 ? floors : [nil],
            unit: width.positive? && height.positive? ? Math.hypot(width, height) / DESIGN_DIAGONAL : 1.0
          )
        end
      end

      def level_key(record)
        "#{record.class.base_class.name.underscore}:#{record.id}"
      end

      def floors_of(record)
        record.respond_to?(:floors) && record.try(:range).present? ? record.floors : []
      rescue StandardError
        []
      end

      def level_buildings
        @level_buildings ||= @graph.levels.map(&:building).compact.uniq
      end

      # A record named for another level's building is that building's.
      def belongs_elsewhere?(building, level)
        building.present? && level.building.present? && building != level.building && level_buildings.include?(building)
      end

      def centre(x, y)
        [x.to_f + ICON_OFFSET, y.to_f + ICON_OFFSET]
      end

      def add_node(node)
        @graph.nodes[node.key] ||= node
        (@graph.node_levels[node.key] ||= []) << node
        node
      end

      def level_rows(level)
        key = [level.record.class.base_class.name, level.record.id]
        [(@hallways[key] || []), (@edge_rows[key] || []), (@attachments[key] || []), (@stops[key] || []), (@plate_doors[key] || [])]
      end

      def build_level(level)
        hallways, edge_rows, attachments, stops, plate_doors = level_rows(level)
        attachment_of = attachments.index_by { |a| [a.attachable_type, a.attachable_id] }
        by_id = hallways.index_by(&:id)

        hallway_nodes = hallways.map do |h|
          cx, cy = centre(h.x_plot, h.y_plot)
          add_node(Node.new(key: "hallway:#{h.id}", kind: 'hallway', record: h, level_key: level.key, floor: nil, building: level.building,
                            x: cx, y: cy, name: nil, anchor: 'point', review: h.review_status))
        end

        # Logical hallway edges once: adjacency from next_points, decorated by the rows.
        rows_by_pair = edge_rows.index_by(&:pair)
        pairs = {}
        hallways.each do |h|
          Array(h.next_points).each do |other_id|
            other = by_id[other_id]
            next unless other

            pairs[[h.id, other_id].minmax] ||= true
          end
        end
        rows_by_pair.each_key { |pair| pairs[pair] ||= true if by_id[pair[0]] && by_id[pair[1]] }
        logical = pairs.keys.map do |a_id, b_id|
          a = @graph.nodes["hallway:#{a_id}"]
          b = @graph.nodes["hallway:#{b_id}"]
          row = rows_by_pair[[a_id, b_id]]
          interior = row ? row.points_from(a_id).map { |px, py| centre(px, py) } : []
          line = [[a.x, a.y]] + interior + [[b.x, b.y]]
          { a: a.key, b: b.key, kind: row&.kind || 'manual', polyline: line, length: polyline_length(line), review: row&.review_status || 'confirmed' }
        end
        @graph.logical_edges.concat(logical.map { |e| e.merge(level_key: level.key) })

        degree = Hash.new(0)
        logical.each { |e| degree[e[:a]] += 1; degree[e[:b]] += 1 }

        anchors = []
        # units
        @units.each do |unit|
          on_level = level.kind == 'sitemap' ? unit.floorplate_id.nil? : unit.floorplate_id == level.record.id
          next unless on_level

          door = (@unit_doors[unit.id] || []).min_by { |d| [d.sort.to_i, d.id] }
          pos = door && (door.x_plot.to_i.positive? || door.y_plot.to_i.positive?) ? centre(door.x_plot, door.y_plot) : [unit.x_plot.to_f, unit.y_plot.to_f]
          anchors << add_node(Node.new(key: "unit:#{unit.id}", kind: 'unit', record: unit, level_key: level.key, floor: level.copies.size > 1 ? unit.floor : nil,
                                       building: unit.building.presence || level.building, x: pos[0], y: pos[1], name: unit.name, anchor: door ? 'door' : 'pin',
                                       lock_provider: lock_provider_of(unit, door), note: unit.stop_description.presence))
        end
        # amenities
        @amenities.each do |amenity|
          next unless amenity.amenityable_type == level.record.class.base_class.name && amenity.amenityable_id == level.record.id

          door = (@amenity_doors[amenity.id] || []).min_by { |d| community.auto_wayfinding ? [d.sort.to_i, d.id] : [d.created_at, d.id] }
          pos = door && (door.x_plot.to_i.positive? || door.y_plot.to_i.positive?) ? centre(door.x_plot, door.y_plot) : [amenity.x_plot.to_f, amenity.y_plot.to_f]
          anchors << add_node(Node.new(key: "amenity:#{amenity.id}", kind: 'amenity', record: amenity, level_key: level.key,
                                       floor: level.copies.size > 1 && amenity.floor.present? ? amenity.floor : nil,
                                       building: amenity.building.presence || level.building, x: pos[0], y: pos[1], name: amenity.name, anchor: door ? 'door' : 'pin',
                                       lock_provider: lock_provider_of(amenity, door), note: amenity.directional_text.presence))
        end
        # plate doors (access points): pass-through stops
        plate_doors.each do |door|
          next unless door.x_plot.to_i.positive? || door.y_plot.to_i.positive?

          cx, cy = centre(door.x_plot, door.y_plot)
          anchors << add_node(Node.new(key: "door:#{door.id}", kind: 'door', record: door, level_key: level.key, floor: door.floor, building: level.building,
                                       x: cx, y: cy, name: door.name, anchor: 'icon_top_left', note: door.note.presence, lock_provider: door.lock_provider.presence))
        end
        # elevators (every kind)
        @elevators.each do |elevator|
          next unless elevator_on_level?(elevator, level)

          served = elevator_floors(elevator)
          floors_here = level.copies.size > 1 ? (served & level.floors) : nil
          floors_here = nil if floors_here && floors_here.size == level.floors.size
          cx, cy = centre(elevator.x_plot, elevator.y_plot)
          node = add_node(Node.new(key: "elevator:#{elevator.id}", kind: 'elevator', record: elevator, level_key: level.key, floor: nil, building: elevator.building.presence || level.building,
                                   x: cx, y: cy, name: elevator.name, anchor: 'icon_top_left', vertical: elevator.kind, accessible: elevator.accessible != false,
                                   served: served, lock_provider: elevator.lock_provider.presence, note: elevator.directional_text.presence))
          @elevator_floors_here ||= {}
          @elevator_floors_here[[level.key, node.key]] = floors_here
          anchors << node
        end
        # building entry/exit points
        @bsps.each do |bsp|
          next if level.kind == 'floorplate' && !level.floors.include?(bsp.floor.to_i)
          next if belongs_elsewhere?(bsp.building, level)
          next unless bsp.x_plot.to_i.positive? || bsp.y_plot.to_i.positive?

          cx, cy = centre(bsp.x_plot, bsp.y_plot)
          node = add_node(Node.new(key: "bsp:#{bsp.id}", kind: 'entry', record: bsp, level_key: level.key, floor: level.copies.size > 1 ? bsp.floor : nil,
                                   building: bsp.building.presence || level.building, x: cx, y: cy, name: bsp.name, anchor: 'icon_top_left',
                                   lock_provider: bsp.lock_provider.presence, note: bsp.directional_text.presence))
          anchors << node
          @graph.gates << node
        end
        # tour start
        if main_tour && (main_tour.x_plot.to_i.positive? || main_tour.y_plot.to_i.positive?) && tour_start_on?(level)
          cx, cy = centre(main_tour.x_plot, main_tour.y_plot)
          start_floor = main_tour.starting_floor || level.floors.min
          node = add_node(Node.new(key: "tour_start:#{main_tour.id}", kind: 'tour_start', record: main_tour, level_key: level.key,
                                   floor: level.copies.size > 1 ? start_floor : nil, building: main_tour.building.presence || level.building,
                                   x: cx, y: cy, name: main_tour.name.presence || 'Tour start', anchor: 'icon_top_left'))
          anchors << node
          @graph.gates << node
        end
        # wayfinding stops
        stops.each do |stop|
          next unless stop.placed?

          node = add_node(Node.new(key: "stop:#{stop.id}", kind: stop.kind, record: stop, level_key: level.key, floor: stop.floor,
                                   building: stop.building.presence || level.building, x: stop.x_plot.to_f, y: stop.y_plot.to_f, name: stop.name,
                                   anchor: 'point', accessible: stop.accessible, note: stop.note.presence, lock_provider: stop.lock_provider.presence,
                                   radius: stop.blocker? ? (stop.radius_px || blocker_radius(level)) : nil))
          anchors << node unless stop.blocker?
          @graph.gates << node if stop.gate?
        end

        # attachments: explicit / detached / nearest
        anchors.each do |node|
          att = attachment_of[[attachable_type_of(node), node.record.id]]
          if att&.detached?
            node.attach = nil
            node.link = 'detached'
            next
          end
          if att&.explicit? && by_id[att.hallway_id]
            node.attach = "hallway:#{att.hallway_id}"
            node.link = 'explicit'
            if att.anchor && !(node.kind == 'unit' || node.kind == 'amenity' ? false : true)
              node.x, node.y = att.anchor
            end
            next
          end
          nearest = hallway_nodes.min_by { |h| Math.hypot(h.x - node.x, h.y - node.y) }
          node.attach = nearest&.key
          node.link = nearest ? 'nearest' : 'none'
        end

        # per-floor copies
        blockers = stops.select { |s| s.blocker? && s.placed? }
        level.copies.each do |floor|
          cuts = @avoid_blockers ? blockers.select { |b| floor.nil? || b.floor.nil? || b.floor == floor } : []
          hallway_nodes.each { |h| register_copy(h, floor) }
          logical.each do |e|
            next if cuts.any? { |b| polyline_distance([b.x_plot.to_f, b.y_plot.to_f], e[:polyline]) < (b.radius_px || blocker_radius(level)) }

            connect(@graph.copy_key(e[:a], level.key, floor), @graph.copy_key(e[:b], level.key, floor), 'walk', e[:length], e[:polyline], nil)
          end
          anchors.each do |node|
            floors_here = node.kind == 'elevator' ? @elevator_floors_here[[level.key, node.key]] : (node.floor.nil? ? nil : [node.floor])
            next if floor && floors_here && !floors_here.include?(floor)

            copy = register_copy(node, floor)
            point_key = node.attach && @graph.copy_key(node.attach, level.key, floor)
            next unless point_key && (point = @graph.copy_nodes[point_key])

            linked = degree[node.attach].positive?
            connect(copy, point_key, 'link', Math.hypot(node.x - point[:x], node.y - point[:y]), [[node.x, node.y], [point[:x], point[:y]]], nil) if linked
            @graph.copy_nodes[copy][:linked] = linked
            @graph.vertical[node.key] << copy if node.kind == 'elevator'
          end
        end
      end

      def attachable_type_of(node)
        case node.kind
        when 'unit' then 'Unit'
        when 'amenity' then 'Amenity'
        when 'door' then 'Door'
        when 'elevator' then 'Elevator'
        when 'entry' then node.record.is_a?(BuildingStartingPoint) ? 'BuildingStartingPoint' : 'WayfindingStop'
        when 'tour_start' then 'Tour'
        else 'WayfindingStop'
        end
      end

      def register_copy(node, floor)
        key = @graph.copy_key(node.key, node.level_key, floor)
        @graph.copy_nodes[key] ||= { key: key, node: node, floor: floor, level_key: node.level_key, x: node.x, y: node.y, linked: node.kind == 'hallway' }
        @graph.adjacency[key] ||= []
        key
      end

      def connect(a, b, kind, weight, polyline, name)
        @graph.adjacency[a] << Edge.new(from: a, to: b, kind: kind, weight: weight, polyline: polyline, name: name)
        @graph.adjacency[b] << Edge.new(from: b, to: a, kind: kind, weight: weight, polyline: polyline&.reverse, name: name)
      end

      def lock_provider_of(record, door)
        provider = door&.lock_provider.presence || record.try(:lock_provider).presence
        provider
      end

      def elevator_floors(elevator)
        elevator.floorplate_covering_range.present? ? elevator.floors : []
      rescue StandardError
        []
      end

      def elevator_on_level?(elevator, level)
        return false unless elevator.x_plot.to_i.positive? || elevator.y_plot.to_i.positive?

        if level.kind == 'sitemap'
          elevator.sitemap_id == level.record.id || (elevator.sitemap_id.nil? && elevator.floorplate_id.nil?)
        else
          overlap = (elevator_floors(elevator) & level.floors).any? || elevator.floorplate_id == level.record.id
          overlap && !belongs_elsewhere?(elevator.building, level)
        end
      end

      def tour_start_on?(level)
        return false if belongs_elsewhere?(main_tour.building, level)
        return true if level.kind == 'sitemap'

        all_floors = @graph.levels.flat_map(&:floors)
        start_floor = main_tour.starting_floor || all_floors.min
        start_floor.nil? ? @graph.levels.first&.key == level.key : level.floors.include?(start_floor)
      end

      def blocker_radius(level)
        level.width.positive? ? [level.width, level.height].max * 30.0 / 760 : 30.0
      end

      def floor_number(copy)
        copy[:floor] || @graph.level(copy[:level_key])&.floors&.first
      end

      def link_vertical
        @graph.vertical.each_value do |copies|
          copies.combination(2).each do |a_key, b_key|
            a = @graph.copy_nodes[a_key]
            b = @graph.copy_nodes[b_key]
            next if a_key == b_key
            next unless a[:linked] && b[:linked]

            node = a[:node]
            next if @step_free && (node.vertical == 'stairs' || node.accessible == false)

            fa = floor_number(a)
            fb = floor_number(b)
            floors = fa && fb ? [1, (fa - fb).abs].max : 1
            unit = ((@graph.level(a[:level_key])&.unit || 1.0) + (@graph.level(b[:level_key])&.unit || 1.0)) / 2.0
            weight = (node.vertical == 'stairs' ? 90.0 * floors : 50.0 + 10.0 * floors) * unit
            connect(a_key, b_key, node.vertical == 'stairs' ? 'stairs' : node.vertical == 'ramp' ? 'ramp' : 'elevator', weight, nil, node.name)
          end
        end
      end

      def link_gates
        gate_copies = @graph.gates.flat_map { |node| @graph.copy_nodes.values.select { |c| c[:node].equal?(node) && c[:linked] } }
        gate_copies.combination(2).each do |a, b|
          ba = a[:node].building
          bb = b[:node].building
          next if ba.blank? || bb.blank? || ba == bb

          unit = ((@graph.level(a[:level_key])&.unit || 1.0) + (@graph.level(b[:level_key])&.unit || 1.0)) / 2.0
          connect(a[:key], b[:key], 'outdoor', 500.0 * unit, nil, "#{a[:node].name}|#{b[:node].name}")
        end
      end

      def tour_stop_rows
        return [] unless main_tour

        TourStop.where(tour_id: main_tour.id).order(Arel.sql('sort ASC NULLS LAST, id ASC')).to_a
      end

      def polyline_length(line)
        line.each_cons(2).sum { |(ax, ay), (bx, by)| Math.hypot(ax - bx, ay - by) }
      end

      def polyline_distance(point, line)
        return Math.hypot(point[0] - line[0][0], point[1] - line[0][1]) if line.size == 1

        line.each_cons(2).map { |a, b| segment_distance(point, a, b) }.min
      end

      def segment_distance(p, a, b)
        dx = b[0] - a[0]
        dy = b[1] - a[1]
        len = dx * dx + dy * dy
        t = len.zero? ? 0.0 : [[((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len, 0.0].max, 1.0].min
        Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
      end
  end
end
