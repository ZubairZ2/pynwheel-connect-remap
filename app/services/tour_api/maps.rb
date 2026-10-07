# frozen_string_literal: true

module TourApi
  # Map levels, one level's nodes and paths, the floor SVG, and the graph,
  # from the Tour App payload of `Wayfinding::GraphSerializer`.
  module Maps
    SVG_PATH = '/api/tour/v1/properties/%<property_id>d/map/levels/%<level_id>s/svg'

    module_function

    # Per level: the SVG proxy path, the stored calibration
    # (`svg_to_image_transform`, when well-formed) and the SVG's recorded size
    # (`svg_metadata`) - known to the map endpoints, not part of the graph payload.
    def level_extras(community, built)
      built.graph.levels.each_with_object({}) do |level, out|
        record = level.record
        transform = Wayfinding::PlateTransform.present?(record) ? record.svg_to_image_transform : nil
        meta = record.try(:svg_metadata)
        size = meta.is_a?(Hash) && Text.truthy?(meta['width']) && Text.truthy?(meta['height']) ? { width: meta['width'], height: meta['height'] } : nil
        out[level.key] = {
          svg_path: record.read_attribute(:svg_image).present? ? format(SVG_PATH, property_id: community.id, level_id: level.key) : nil,
          svg_transform: transform,
          svg_size: size
        }
      end
    end

    def map(community, built, payload)
      extras = level_extras(community, built)
      levels = payload[:levels].map { |level| Shapes.level(level, extras[level[:id]]) }
      buildings = payload[:buildings].map { |name| { name: name, level_ids: levels.select { |l| l[:building] == name }.map { |l| l[:id] } } }
      unassigned = levels.select { |l| l[:building].nil? || !payload[:buildings].include?(l[:building]) }.map { |l| l[:id] }
      buildings << { name: payload[:buildings].first || 'Property', level_ids: unassigned } if unassigned.any? && buildings.empty?
      {
        success: true, property_id: community.id, graph_version: payload[:version], is_sitemap: payload[:is_sitemap],
        auto_wayfinding: payload[:auto_wayfinding], scale: payload[:scale], buildings: buildings, levels: levels
      }
    end

    def level(community, built, payload, level_id)
      level = find_level(payload, level_id)
      {
        success: true, property_id: community.id, graph_version: payload[:version],
        level: Shapes.level(level, level_extras(community, built)[level_id]),
        nodes: payload[:nodes].select { |n| n[:level] == level_id }.map { |n| Shapes.node(n) },
        edges: payload[:edges].select { |e| e[:level] == level_id }.map { |e| Shapes.edge(e) }
      }
    end

    # The level's floor SVG, read server-side and validated.
    def svg(payload, level_id, base_url)
      level = find_level(payload, level_id)
      raise ApiError.not_found('This level has no SVG floor plan.', code: 'no_svg') if level[:svg].blank?

      Assets.svg(level[:svg], local_base: base_url)
    rescue Assets::Error => e
      raise ApiError.new(e.code == 'invalid_svg' ? 422 : 502, e.code, e.message)
    end

    def graph(payload)
      Shapes.graph(payload)
    end

    def find_level(payload, level_id)
      payload[:levels].find { |l| l[:id] == level_id } || raise(ApiError.not_found('No such level on this property.', code: 'unknown_level'))
    end
  end
end
