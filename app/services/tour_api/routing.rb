# frozen_string_literal: true

module TourApi
  # Routes for the Tour App: the Rails engine's legs and steps, adapted into
  # the stop-by-stop contract the mobile screens render.
  #
  # Every title and description is assembled from real route data: the
  # leg's level and floor, the names of the nodes the route passes, the
  # pixel length (feet when the level has a scale), and the stop's own
  # directional text when the CMS holds one. Nothing is hard-coded and
  # nothing is generated.
  module Routing
    module_function

    def route(community, built, from:, to:, from_floor:, to_floor:, step_free:, avoid_blockers:)
      service = RouteService.new(community, from: from, to: to, step_free: step_free, avoid_blockers: avoid_blockers,
                                            from_floor: from_floor, to_floor: to_floor, graph: built.graph)
      result = service.call
      raise failure(result, built.version) unless result.ok

      { success: true, graph_version: built.version, route: route_out(built.graph, result, step_free: step_free, avoid_blockers: avoid_blockers) }
    end

    # Validates that every chosen stop is on this property's stops list,
    # orders them by the tour's own rule and routes start → stops → start;
    # `segments` holds the route that reaches each stop.
    def tour_route(community, built, stop_ids:, step_free:, avoid_blockers:)
      wanted = stop_ids.uniq # duplicates collapse to one visit
      selectable = Stops.selectable_ids(community, built)
      invalid = wanted.reject { |id| selectable.include?(id) }
      if invalid.any?
        raise ApiError.unprocessable('invalid_stop', "Some chosen stops are not on this property's stops list.", { invalid_stops: invalid })
      end

      result, segments = RouteService.new(community, step_free: step_free, avoid_blockers: avoid_blockers, graph: built.graph).tour(stop_keys: wanted)
      raise failure(result, built.version) unless result.ok

      out = segments.filter_map do |segment|
        next if segment.tour_stop.nil? # the return to the start is part of the whole route, not a stop the visitor reaches

        dwell = segment.tour_stop.duration_minutes.to_i * 60
        { stop_id: segment.node_key, tour_stop_id: segment.tour_stop.id, from_stop_id: segment.from,
          route: route_out(built.graph, segment.result, step_free: step_free, avoid_blockers: avoid_blockers, dwell_s: dwell) }
      end
      reached = out.map { |segment| segment[:stop_id] }.to_set
      whole = route_out(built.graph, result, step_free: step_free, avoid_blockers: avoid_blockers, step_list: tour_steps(built.graph, segments))
      { success: true, graph_version: built.version, route: whole, segments: out, skipped: wanted.reject { |id| reached.include?(id) } }
    end

    def distances(community, built, stop_ids:)
      measured = RouteService.new(community, step_free: false, avoid_blockers: true, graph: built.graph).distances(stop_ids.uniq)
      start = built.graph.nodes.keys.find { |k| k.start_with?('tour_start:') }
      {
        success: true, graph_version: built.version, from_stop_id: start,
        distances: measured.transform_values do |d|
          { reachable: d.ok, distance: d.length_px.round(1), unit: 'px', distance_ft: d.length_ft, duration_s: d.duration_s, direction: d.direction, error: d.error }
        end
      }
    end

    # A failed route as a 422 with the wayfinding error code and the facts the app can show.
    def failure(result, version)
      error = result.error || { code: 'no_path', message: 'No path connects those two places.' }
      details = { from: result.from, to: result.to }
      details.merge!(error[:details]) if error[:details].present?
      details[:warnings] = result.warnings if result.warnings.present?
      details[:graph_version] = version
      ApiError.unprocessable(error[:code].to_s, error[:message], details)
    end

    # ------------------------------------------------------------ the route payload

    def route_out(graph, result, step_free:, avoid_blockers:, dwell_s: nil, step_list: nil)
      legs = result.legs
      floors = []
      seen = Set.new
      legs.each do |leg|
        next unless leg.kind == 'walk' && seen.add?([leg.level_key, leg.floor])

        floors << floor_ref(graph, leg.level_key, leg.floor)
      end
      buildings = legs.select { |leg| leg.kind == 'walk' && leg.building.present? }.map(&:building).uniq
      {
        start: place(graph, result.from) || { id: result.from.to_s, type: nil, name: result.from },
        destination: place(graph, result.to) || { id: result.to.to_s, type: nil, name: result.to },
        step_free: step_free,
        avoid_blockers: avoid_blockers,
        total_distance: result.length_px,
        unit: 'px',
        total_distance_ft: result.length_ft,
        duration_s: result.duration_s,
        floors: floors,
        buildings: buildings,
        stages: stages(legs),
        legs: legs_out(legs),
        steps: step_list || steps(graph, legs, dwell_s),
        warnings: result.warnings.dup
      }
    end

    def place(graph, key)
      return nil if key.blank?

      node = graph.nodes[key]
      { id: key, type: node&.kind, name: Text.name_of(node, key) }
    end

    def floor_ref(graph, level_key, floor)
      { level_id: level_key, number: floor, name: Text.place_name(graph, level_key, floor) }
    end

    def scale_of(graph, leg)
      scale = graph.level(leg.level_key)&.record.try(:scale_ft_per_px)
      scale.present? && scale.to_f.positive? ? scale.to_f : nil
    end

    def format_distance(graph, leg)
      scale = scale_of(graph, leg)
      return "#{Text.delimited(Text.round_half_even(leg.length_px * scale))} ft" if scale

      "#{Text.delimited(Text.round_half_even(leg.length_px))} px"
    end

    def feet(graph, leg)
      scale = scale_of(graph, leg)
      scale ? (leg.length_px * scale).round(1) : nil
    end

    # The levels the route visits in order, with the first leg on each.
    def stages(legs)
      legs.each_with_object([]) do |leg, out|
        next unless leg.kind == 'walk' && leg.level_key

        last = out.last
        next if last && last[:level_id] == leg.level_key && last[:floor] == leg.floor

        out << { level_id: leg.level_key, floor: leg.floor, building: leg.building, leg: leg.index }
      end
    end

    def legs_out(legs)
      legs.map do |leg|
        if leg.kind == 'walk'
          { index: leg.index, kind: 'walk', level: leg.level_key, floor: leg.floor, building: leg.building, from: leg.from, to: leg.to,
            length_px: leg.length_px.round(1), points: leg.points.map { |x, y| [x.round(2), y.round(2)] }, nodes: leg.nodes.dup }
        else
          { index: leg.index, kind: leg.kind, via: leg.via, name: leg.name, floor_from: leg.floor_from, floor_to: leg.floor_to, from: leg.from, to: leg.to, length_px: 0.0 }
        end
      end
    end

    # Each step is assembled from the leg it describes and the real nodes it
    # joins. A zero-length walk (arriving exactly at a connector) is not a
    # step, as in `Wayfinding::Timing`.
    def steps(graph, legs, dwell_s)
      out = []
      sequence = 1
      legs.each do |leg|
        case leg.kind
        when 'walk'
          next if leg.points.size < 2 && legs.size > 1

          from = place(graph, leg.from)
          to = place(graph, leg.to)
          floor = floor_ref(graph, leg.level_key, leg.floor)
          out << step(sequence, 'walk', "Walk on #{floor[:name]}", "From #{from ? from[:name] : leg.from} to #{to ? to[:name] : leg.to} · #{format_distance(graph, leg)}",
                      distance: leg.length_px.round(1), distance_ft: feet(graph, leg), floor: floor, from: from, to: to, leg: leg.index,
                      geometry: leg.points.map { |x, y| [x.round(2), y.round(2)] })
        when 'elevator', 'stairs', 'ramp'
          floors = leg.floor_from && leg.floor_to ? [1, (leg.floor_to - leg.floor_from).abs].max : 1
          direction = leg.floor_to && leg.floor_from && leg.floor_to < leg.floor_from ? 'Down' : 'Up'
          verb = case leg.kind
                 when 'stairs' then 'Take the stairs'
                 when 'ramp' then 'Take the ramp'
                 else "Take #{leg.name.presence || 'the elevator'}"
                 end
          via_node = graph.nodes[leg.via.to_s]
          out << step(sequence, leg.kind, "#{verb} to Floor #{Text.py_str(leg.floor_to)}", "#{direction} #{floors} #{floors == 1 ? 'floor' : 'floors'}",
                      instruction: Text.strip_html(via_node&.note), floor: floor_ref(graph, nil, leg.floor_to), from: place(graph, leg.from), to: place(graph, leg.to), leg: leg.index,
                      transition: { kind: leg.kind, via: leg.via, name: leg.name, floor_from: leg.floor_from, floor_to: leg.floor_to,
                                    from_level_id: graph.nodes[leg.from]&.level_key, to_level_id: next_walk_level(legs, leg.index) })
        when 'outdoor'
          parts = leg.name.to_s.split('|')
          to = place(graph, leg.to)
          out << step(sequence, 'outdoor', "Walk outside to #{to ? to[:name] : leg.to}", "Leave by #{parts[0] || ''}, enter by #{parts[1] || ''}",
                      floor: nil, from: place(graph, leg.from), to: to, leg: leg.index,
                      transition: { kind: 'outdoor', via: leg.name, name: leg.name, floor_from: leg.floor_from, floor_to: leg.floor_to,
                                    from_level_id: prev_walk_level(legs, leg.index), to_level_id: next_walk_level(legs, leg.index) })
        else
          next
        end
        sequence += 1
      end
      if (last = legs.last)
        destination = graph.nodes[last.to]
        floor = floor_ref(graph, last.level_key, last.floor)
        out << step(sequence, 'arrive', "Arrive at #{Text.name_of(destination, last.to)}", floor[:name],
                    instruction: Text.strip_html(destination&.note), floor: floor, from: place(graph, last.from), to: place(graph, last.to), leg: last.index, dwell_s: dwell_s)
      end
      out
    end

    def step(sequence, type, title, description, instruction: nil, distance: 0.0, distance_ft: nil, floor: nil, from: nil, to: nil, leg: 0, geometry: [], transition: nil, dwell_s: nil)
      { sequence: sequence, type: type, title: title, description: description, instruction: instruction, distance: distance, unit: 'px', distance_ft: distance_ft,
        floor: floor, from: from, to: to, leg: leg, geometry: geometry, transition: transition, dwell_s: dwell_s }
    end

    # The level the walk after position `index` is on (the list is sliced by
    # position, as the contract's first implementation sliced it).
    def next_walk_level(legs, index)
      Array(legs[(index + 1)..]).find { |leg| leg.kind == 'walk' }&.level_key
    end

    def prev_walk_level(legs, index)
      legs[0...index].reverse.find { |leg| leg.kind == 'walk' }&.level_key
    end

    # The whole tour's steps: each segment's steps in order (arrivals included), renumbered, leg indexes offset into the whole.
    def tour_steps(graph, segments)
      out = []
      offset = 0
      segments.each do |segment|
        dwell = segment.tour_stop ? segment.tour_stop.duration_minutes.to_i * 60 : nil
        steps(graph, segment.result.legs, dwell).each { |s| out << s.merge(sequence: out.size + 1, leg: s[:leg] + offset) }
        offset += segment.result.legs.size
      end
      out
    end
  end
end
