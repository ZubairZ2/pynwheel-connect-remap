# frozen_string_literal: true

module TourApi
  # `Wayfinding::RouteService` with the two questions the Tour App asks on
  # top of a route between two places: the route through a *chosen subset*
  # of the tour's stops, kept stop by stop (segments), and the distance from
  # the tour start to each of several stops. Dijkstra, the legs, the error
  # taxonomy and the ordering rule are the parent's, untouched; this class
  # only sequences them. The open graph a blocked route is diagnosed against
  # comes from `TourApi::Engine`'s cache, never a fresh database build.
  class RouteService < Wayfinding::RouteService
    Segment = Struct.new(:node_key, :tour_stop, :from, :result, keyword_init: true)
    Distance = Struct.new(:key, :ok, :length_px, :length_ft, :duration_s, :direction, :error, keyword_init: true)

    INVALID_STOP = '%<name>s is not a stop of this tour.'

    def graph
      @graph ||= TourApi::Engine.built(@community, step_free: @step_free, avoid_blockers: @avoid_blockers).graph
    end

    # The whole tour (start → stops in tour order → start) or, with
    # `stop_keys`, only those stops (each must be a visible, mapped stop of
    # the tour, else `invalid_stop`). Answers [Result, segments]: one segment
    # per leg of the sequence, the return to the start included (without a
    # tour stop), so the whole tour's steps can be assembled from them.
    def tour(stop_keys: nil)
      start = graph.nodes.keys.find { |k| k.start_with?('tour_start:') }
      return [failure(:no_start, from: nil, to: nil), []] unless start

      rows = ordered_tour_stops
      unless stop_keys.nil?
        known = rows.map { |row| row[:node].key }.to_set
        unknown = stop_keys.reject { |key| known.include?(key) }
        return [invalid_stop_failure(start, unknown), []] if unknown.any?

        wanted = stop_keys.to_set
        seen = Set.new
        # A stop listed twice in `tour_stops` (legacy duplicates) is visited once: the first row in tour order.
        rows = rows.select { |row| wanted.include?(row[:node].key) && seen.add?(row[:node].key) }
      end
      start_copy = copy_of(graph.nodes[start], nil)
      return [failure(:no_start, from: nil, to: nil), []] unless start_copy.is_a?(String)

      sequence = [[start_copy, nil]] + rows.map { |row| [row[:copy], row] } + [[start_copy, nil]]
      legs = []
      steps = []
      warnings = []
      segments = []
      length = 0.0
      duration = 0.0
      duration_known = true
      sequence.each_cons(2) do |(from_copy, _), (to_copy, stop_row)|
        from_node = graph.node(from_copy)[:node]
        to_node = graph.node(to_copy)[:node]
        partial = route_between(from_copy, to_copy, from: from_node.key, to: to_node.key)
        unless partial.ok
          warnings << "#{partial.error[:message]} (#{from_node.name} → #{to_node.name})"
          next
        end
        # The whole tour's legs and steps carry whole-tour indexes; each
        # segment keeps its own (0-based) so a segment is a route on its own
        # and its steps index its legs. (The FastAPI service offset the
        # segment legs in place and then again when assembling the whole
        # tour's steps, so a step's `leg` and a transition's `to_level_id`
        # were wrong after the first stop.)
        offset = legs.size
        legs.concat(partial.legs.map { |leg| leg.dup.tap { |copy| copy.index += offset } })
        steps.concat(partial.steps.map { |step| step.merge(leg: step[:leg] + offset) })
        length += partial.length_px
        if partial.duration_s.nil?
          duration_known = false
        else
          duration += partial.duration_s
        end
        if stop_row.nil?
          segments << Segment.new(node_key: to_node.key, tour_stop: nil, from: from_node.key, result: partial)
          next
        end
        dwell = stop_row[:tour_stop].duration_minutes.to_i * 60
        steps.last[:dwell_s] = dwell if steps.last && steps.last[:kind] == 'arrive'
        duration += dwell
        segments << Segment.new(node_key: to_node.key, tour_stop: stop_row[:tour_stop], from: from_node.key, result: partial)
      end
      return [failure(:no_path, from: start, to: start, warnings: warnings), []] if legs.empty?

      result = Result.new(ok: true, from: start, to: start, legs: legs, steps: steps, length_px: length.round(1), length_ft: feet(legs),
                          duration_s: duration_known ? duration.round : nil, warnings: warnings, error: nil, graph: graph)
      [result, segments]
    end

    # From the tour start to each target, over one graph.
    def distances(targets)
      start = graph.nodes.keys.find { |k| k.start_with?('tour_start:') }
      start_copy = start ? copy_of(graph.nodes[start], nil) : :unknown
      targets.each_with_object({}) do |target, out|
        unless start_copy.is_a?(String)
          out[target] = unreachable(target, code: 'no_start', message: ERRORS[:no_start])
          next
        end
        resolved = resolve(target, nil)
        if resolved == :unknown
          out[target] = unreachable(target, code: 'unknown_endpoint', message: ERRORS[:unknown_endpoint])
          next
        end
        if resolved == :ambiguous
          out[target] = unreachable(target, code: 'ambiguous_floor', message: ERRORS[:ambiguous_floor])
          next
        end
        if resolved == start_copy
          out[target] = Distance.new(key: target, ok: true, length_px: 0.0, length_ft: 0.0, duration_s: 0, direction: 'level', error: nil)
          next
        end
        result = route_between(start_copy, resolved, from: start.to_s, to: target)
        unless result.ok
          out[target] = Distance.new(key: target, ok: false, length_px: 0.0, length_ft: nil, duration_s: nil, direction: 'level', error: result.error)
          next
        end
        vertical = result.legs.reject { |leg| %w[walk outdoor].include?(leg.kind) }
        up = vertical.any? { |leg| leg.floor_to.to_i > leg.floor_from.to_i }
        down = vertical.any? { |leg| leg.floor_to.to_i < leg.floor_from.to_i }
        out[target] = Distance.new(key: target, ok: true, length_px: result.length_px, length_ft: result.length_ft, duration_s: result.duration_s,
                                   direction: up ? 'up' : (down ? 'down' : 'level'), error: nil)
      end
    end

    private

      def unreachable(target, code:, message:)
        Distance.new(key: target, ok: false, length_px: 0.0, length_ft: nil, duration_s: nil, direction: 'level', error: { code: code, message: message })
      end

      def invalid_stop_failure(start, unknown)
        Result.new(ok: false, from: start, to: nil, legs: [], steps: [], length_px: 0, length_ft: nil, duration_s: nil, warnings: [],
                   error: { code: 'invalid_stop', message: format(INVALID_STOP, name: unknown.join(', ')), fix: nil, details: { invalid_stops: unknown } }, graph: graph)
      end
  end
end
