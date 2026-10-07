# frozen_string_literal: true

module TourApi
  # The response shapes of the Tour App API's map and graph payloads: every
  # field of every object is present, null when it does not apply (the
  # contract was defined as Pydantic models, which serialize defaults), in
  # the models' field order. `Wayfinding::GraphSerializer` omits the keys a
  # node kind does not have; these pick them back in.
  module Shapes
    LEVEL_KEYS = %i[id kind name building floors image svg width height space scale_ft_per_px version svg_path svg_transform svg_size].freeze
    NODE_KEYS = %i[id kind level floor building name x y anchor review attach link lock_provider note vertical accessible floors_served positions radius_px].freeze
    EDGE_KEYS = %i[from to kind path_kind level length_px polyline].freeze
    VERTICAL_KEYS = %i[id kind floors accessible levels].freeze
    GATE_KEYS = %i[id building kind].freeze
    TOUR_STOP_KEYS = %i[tour_stop_id node stop_type name sort visible duration_minutes on_map].freeze
    TOUR_KEYS = %i[id start starting_floor building building_order version].freeze

    module_function

    def pick(hash, keys)
      keys.each_with_object({}) { |key, out| out[key] = hash[key] }
    end

    # `extras` (svg_path, svg_transform, svg_size) are known to the map
    # endpoints only; the graph endpoint serves them null.
    def level(level_hash, extras = nil)
      pick(extras ? level_hash.merge(extras) : level_hash, LEVEL_KEYS)
    end

    def node(node_hash)
      pick(node_hash, NODE_KEYS)
    end

    def edge(edge_hash)
      pick(edge_hash, EDGE_KEYS)
    end

    def tour(tour_hash)
      return nil if tour_hash.nil?

      pick(tour_hash, TOUR_KEYS).merge(stops: Array(tour_hash[:stops]).map { |stop| pick(stop, TOUR_STOP_KEYS) })
    end

    # GET /properties/{id}/graph: the GraphSerializer payload, every field present.
    def graph(payload)
      {
        success: true,
        version: payload[:version],
        community_id: payload[:community_id],
        is_sitemap: payload[:is_sitemap],
        auto_wayfinding: payload[:auto_wayfinding],
        scale: payload[:scale],
        levels: payload[:levels].map { |l| level(l) },
        buildings: payload[:buildings],
        nodes: payload[:nodes].map { |n| node(n) },
        edges: payload[:edges].map { |e| edge(e) },
        vertical_connections: payload[:vertical_connections].map { |v| pick(v, VERTICAL_KEYS) },
        gates: payload[:gates].map { |g| pick(g, GATE_KEYS) },
        tour: tour(payload[:tour])
      }
    end
  end
end
