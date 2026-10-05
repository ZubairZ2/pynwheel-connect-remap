# frozen_string_literal: true

module Wayfinding
  # A `RouteService::Result` as the Tour App and Connect receive it.
  class RouteSerializer
    def initialize(result, version:, step_free:, avoid_blockers:)
      @result = result
      @version = version
      @step_free = step_free
      @avoid_blockers = avoid_blockers
    end

    def as_json(*)
      result = @result
      unless result.ok
        return { success: false, version: @version, from: result.from, to: result.to, error: result.error, warnings: result.warnings }
      end

      {
        success: true,
        version: @version,
        from: result.from,
        to: result.to,
        step_free: @step_free,
        avoid_blockers: @avoid_blockers,
        length_px: result.length_px,
        length_ft: result.length_ft,
        duration_s: result.duration_s,
        legs: result.legs.map { |leg| leg_json(leg) },
        steps: result.steps,
        warnings: result.warnings
      }
    end

    private

      def leg_json(leg)
        json = { index: leg.index, kind: leg.kind }
        if leg.kind == 'walk'
          json.merge!(level: leg.level_key, floor: leg.floor, building: leg.building, from: leg.from, to: leg.to, length_px: leg.length_px.round(1),
                      points: leg.points.map { |x, y| [x.round(2), y.round(2)] }, nodes: leg.nodes)
        else
          json.merge!(via: leg.via, name: leg.name, floor_from: leg.floor_from, floor_to: leg.floor_to, from: leg.from, to: leg.to, length_px: 0)
        end
        json
      end
  end
end
