# frozen_string_literal: true

module Wayfinding
  # The Tour App's view of a property's wayfinding graph (`GET
  # /api/self_tour/v1/communities/:id/wayfinding`): domain concepts only -
  # levels, nodes, edges, vertical connections, gates and the tour - with
  # stable typed ids and stored coordinates (each node says what its
  # coordinates anchor: an icon's top-left or the point itself). Never the
  # access codes.
  class GraphSerializer
    def initialize(graph, version:, base_url:)
      @graph = graph
      @version = version
      @base_url = base_url
    end

    def as_json(*)
      community = @graph.community
      {
        success: true,
        version: @version,
        community_id: community.id,
        is_sitemap: community.is_sitemap.present?,
        auto_wayfinding: community.auto_wayfinding.present?,
        scale: { unit: 'px', ft_per_px: nil },
        levels: @graph.levels.map { |level| level_json(level) },
        buildings: @graph.buildings,
        # Unique by (id, level): a record that stands on two levels (an elevator
        # serving two floorplates) is listed once per level, each with the
        # hallway it joins there.
        nodes: @graph.node_levels.values.flatten.map { |node| node_json(node) },
        edges: @graph.logical_edges.map { |edge| edge_json(edge) },
        vertical_connections: vertical_connections,
        gates: @graph.gates.map { |node| { id: node.key, building: node.building, kind: node.kind } },
        tour: tour_json
      }
    end

    private

      def level_json(level)
        record = level.record
        bucket = Connect::UploadUrl.bucket_hint(@graph.community)
        {
          id: level.key,
          kind: level.kind,
          name: level.kind == 'sitemap' ? 'Property map' : record.name,
          building: level.building,
          floors: level.floors,
          image: Connect::UploadUrl.image(record, @base_url, bucket: bucket),
          svg: Connect::UploadUrl.upload(record, :svg_image, @base_url, bucket: Connect::UploadUrl.bucket_of(record, bucket)),
          width: level.width.positive? ? level.width.round : nil,
          height: level.height.positive? ? level.height.round : nil,
          space: level.space,
          scale_ft_per_px: record.try(:scale_ft_per_px)&.to_f,
          version: record.try(:wayfinding_version)
        }
      end

      # `floor` is concrete whenever it can be: the node's own floor, else the
      # level's only floor. It stays null only on a stacked level, for a node
      # that stands on every floor of it (a hallway, an elevator).
      def floor_of(node)
        return node.floor unless node.floor.nil?

        floors = @graph.level(node.level_key)&.floors || []
        floors.size == 1 ? floors.first : nil
      end

      def node_json(node)
        json = { id: node.key, kind: node.kind, level: node.level_key, floor: floor_of(node), building: node.building, name: node.name,
                 x: stored_x(node), y: stored_y(node), anchor: anchor_of(node) }
        json[:review] = node.review if node.kind == 'hallway'
        unless node.kind == 'hallway' || node.kind == 'blocker'
          json[:attach] = node.attach
          json[:link] = node.link
        end
        json[:lock_provider] = node.lock_provider if node.lock_provider
        json[:note] = node.note if node.note
        if node.kind == 'elevator'
          json[:vertical] = node.vertical
          json[:accessible] = node.accessible
          json[:floors_served] = node.served
          positions = node.record.floor_positions
          json[:positions] = positions if positions.is_a?(Hash) && positions.any?
        end
        json[:radius_px] = node.radius if node.kind == 'blocker'
        json
      end

      # Legacy icon records are exposed as stored (icon top-left); the graph
      # holds centres, so take the offset back off.
      def legacy_icon?(node)
        %w[hallway door elevator entry tour_start].include?(node.kind) && !node.record.is_a?(WayfindingStop)
      end

      def stored_x(node)
        legacy_icon?(node) ? node.x - GraphBuilder::ICON_OFFSET : node.x
      end

      def stored_y(node)
        legacy_icon?(node) ? node.y - GraphBuilder::ICON_OFFSET : node.y
      end

      def anchor_of(node)
        return 'icon_top_left' if legacy_icon?(node)
        return 'door' if node.anchor == 'door'

        'point'
      end

      def edge_json(edge)
        { from: edge[:a], to: edge[:b], kind: 'walk', path_kind: edge[:kind], level: edge[:level_key], length_px: edge[:length].round(1),
          polyline: edge[:polyline].map { |x, y| [x.round(2), y.round(2)] } }
      end

      def vertical_connections
        @graph.nodes.values.select { |n| n.kind == 'elevator' }.map do |node|
          { id: node.key, kind: node.vertical, floors: node.served, accessible: node.accessible, levels: @graph.instances(node.key).map(&:level_key) }
        end
      end

      def tour_json
        tour = @graph.tour
        return nil unless tour

        start = @graph.nodes.keys.find { |k| k.start_with?('tour_start:') }
        {
          id: tour.id,
          start: start,
          starting_floor: tour.starting_floor,
          building: tour.building.presence,
          building_order: Array(tour.building_order),
          version: tour.tour_setup_version,
          stops: @graph.tour_stops.map do |ts|
            key = { 'unit' => 'unit', 'amenity' => 'amenity', 'elevator' => 'elevator', 'building_starting_point' => 'bsp' }[ts.stop_type]
            { tour_stop_id: ts.id, node: key ? "#{key}:#{ts.stop_id}" : nil, stop_type: ts.stop_type, name: ts.name, sort: ts.sort,
              visible: ts.display_stop != false, duration_minutes: ts.duration_minutes, on_map: key ? @graph.nodes.key?("#{key}:#{ts.stop_id}") : false }
          end
        }
      end
  end
end
