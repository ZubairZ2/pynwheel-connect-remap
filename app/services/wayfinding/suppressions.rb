# frozen_string_literal: true

module Wayfinding
  # Tombstones of user deletions (`hallway_suppressions`) and the tolerance
  # within which a detected proposal "is" a deleted node or edge.
  module Suppressions
    module_function

    RASTER_TOLERANCE_PX = 6.0
    SVG_TOLERANCE_RATIO = 0.004

    # How close two points must be to count as the same, per space.
    def tolerance(space, diagonal = nil)
      return RASTER_TOLERANCE_PX if space.to_s != 'svg'
      return RASTER_TOLERANCE_PX if diagonal.nil? || diagonal <= 0

      [diagonal * SVG_TOLERANCE_RATIO, 1.0].max
    end

    def near?(ax, ay, bx, by, tol)
      Math.hypot(ax.to_f - bx.to_f, ay.to_f - by.to_f) <= tol
    end

    def record_node!(hallway, user: nil)
      HallwaySuppression.create!(
        parent_type: hallway.parent_type, parent_id: hallway.parent_id, community_id: hallway.community_id,
        kind: 'node', space: hallway.space, x1: hallway.x_plot.to_f, y1: hallway.y_plot.to_f,
        removed_source: hallway.source, removed_by_user_id: user&.id, created_at: Time.current
      )
    end

    def record_edge!(a, b, edge_row: nil, user: nil)
      lo, hi = [a, b].sort_by(&:id)
      HallwaySuppression.create!(
        parent_type: lo.parent_type, parent_id: lo.parent_id, community_id: lo.community_id,
        kind: 'edge', space: lo.space, x1: lo.x_plot.to_f, y1: lo.y_plot.to_f, x2: hi.x_plot.to_f, y2: hi.y_plot.to_f,
        hallway_a_id: lo.id, hallway_b_id: hi.id, removed_kind: edge_row&.kind, removed_source: edge_row&.detection_run_id ? 'detected' : 'manual',
        removed_by_user_id: user&.id, created_at: Time.current
      )
    end

    # The node tombstones a proposal at (x, y) matches.
    def matching_nodes(tombstones, x, y, space, tol)
      tombstones.select { |t| t.node? && t.space == space.to_s && near?(t.x1, t.y1, x, y, tol) }
    end

    # The edge tombstones a proposal between two nodes matches: by canonical
    # pair when both survive, else by endpoint geometry either way round.
    def matching_edges(tombstones, a, b, space, tol)
      lo_id, hi_id = [a.id, b.id].compact.minmax
      tombstones.select do |t|
        next false unless t.edge? && t.space == space.to_s
        next true if lo_id && t.hallway_a_id == lo_id && t.hallway_b_id == hi_id

        (near?(t.x1, t.y1, a.x_plot, a.y_plot, tol) && near?(t.x2, t.y2, b.x_plot, b.y_plot, tol)) ||
          (near?(t.x1, t.y1, b.x_plot, b.y_plot, tol) && near?(t.x2, t.y2, a.x_plot, a.y_plot, tol))
      end
    end

    def clear!(parent)
      HallwaySuppression.on_level(parent).delete_all
    end
  end
end
