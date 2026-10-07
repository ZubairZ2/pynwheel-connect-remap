# frozen_string_literal: true

module Wayfinding
  # The steps a route reads out and the time it takes, computed once in Rails
  # so Connect's preview and the Tour App print the same text. Walking speed
  # 4.4 ft/s where a level has a scale; an elevator ride 30 + 8 s per floor;
  # stairs 15 s per floor. Pixels are only ever converted to feet when a
  # `scale_ft_per_px` is stored; nothing is assumed.
  module Timing
    module_function

    WALK_FT_PER_S = 4.4

    def duration(legs, graph)
      total = 0.0
      legs.each do |leg|
        case leg.kind
        when 'walk'
          scale = scale_of(leg, graph)
          return nil if scale.nil?

          total += leg.length_px * scale / WALK_FT_PER_S
        when 'elevator', 'ramp'
          total += 30 + 8 * floors_between(leg)
        when 'stairs'
          total += 15 * floors_between(leg)
        when 'outdoor'
          return nil
        end
      end
      total.round
    end

    def steps(legs, graph)
      out = []
      legs.each do |leg|
        case leg.kind
        when 'walk'
          next if leg.points.size < 2 && legs.size > 1

          destination = graph.nodes[leg.to]
          scale = scale_of(leg, graph)
          distance = scale ? "#{(leg.length_px * scale).round} ft" : "#{leg.length_px.round} px"
          out << { kind: 'walk', leg: leg.index, title: "Walk to #{name_of(destination)}", sub: "#{distance} on #{place(leg, graph)}" }
        when 'elevator', 'stairs', 'ramp'
          floors = floors_between(leg)
          direction = leg.floor_to && leg.floor_from && leg.floor_to < leg.floor_from ? 'Down' : 'Up'
          verb = leg.kind == 'stairs' ? 'Take the stairs' : leg.kind == 'ramp' ? 'Take the ramp' : "Take #{leg.name}"
          out << { kind: leg.kind, leg: leg.index, title: "#{verb} to Floor #{leg.floor_to}", sub: "#{direction} #{floors} #{floors == 1 ? 'floor' : 'floors'}" }
        when 'outdoor'
          out_name, in_name = leg.name.to_s.split('|')
          out << { kind: 'outdoor', leg: leg.index, title: "Walk outside to #{name_of(graph.nodes[leg.to])}", sub: "Leave by #{out_name}, enter by #{in_name}" }
        end
      end
      last = legs.last
      if last
        destination = graph.nodes[last.to]
        out << { kind: 'arrive', leg: last.index, title: "Arrive at #{name_of(destination)}", sub: destination&.note.presence || place(last, graph) }
      end
      out
    end

    def floors_between(leg)
      return 1 if leg.floor_from.nil? || leg.floor_to.nil?

      [1, (leg.floor_to - leg.floor_from).abs].max
    end

    def scale_of(leg, graph)
      scale = graph.level(leg.level_key)&.record.try(:scale_ft_per_px)
      scale.present? && scale.to_f.positive? ? scale.to_f : nil
    end

    def place(leg, graph)
      level = graph.level(leg.level_key)
      return 'the property map' if level&.kind == 'sitemap'

      leg.floor ? "Floor #{leg.floor}" : (level&.record.try(:name).presence || 'the floor')
    end

    def name_of(node)
      node&.name.presence || node&.key.to_s.split(':').first.to_s.humanize
    end
  end
end
