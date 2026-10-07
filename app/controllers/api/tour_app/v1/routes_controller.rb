# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Routing over the property's persisted graph: shortest route between
      # two places, the route through the chosen stops (stop by stop), and
      # the distance from the tour start to each stop.
      class RoutesController < PropertyController
        def route
          from = string_param(params[:from_stop_id], loc: %w[body from_stop_id], min: 3, max: 64)
          to = string_param(params[:to_stop_id], loc: %w[body to_stop_id], min: 3, max: 64)
          from_floor = integer_param(params[:from_floor], loc: %w[body from_floor])
          to_floor = integer_param(params[:to_floor], loc: %w[body to_floor])
          step_free = boolean_param(params[:step_free], default: false, loc: %w[body step_free])
          avoid_blockers = boolean_param(params[:avoid_blockers], default: true, loc: %w[body avoid_blockers])
          built = TourApi::Engine.built(@property, step_free: step_free, avoid_blockers: avoid_blockers)
          render json: TourApi::Routing.route(@property, built, from: from, to: to, from_floor: from_floor, to_floor: to_floor,
                                                                step_free: step_free, avoid_blockers: avoid_blockers)
        end

        def tour_route
          stop_ids = string_list_param(params[:stop_ids], loc: %w[body stop_ids], min: 1, max: 100)
          step_free = boolean_param(params[:step_free], default: false, loc: %w[body step_free])
          avoid_blockers = boolean_param(params[:avoid_blockers], default: true, loc: %w[body avoid_blockers])
          built = TourApi::Engine.built(@property, step_free: step_free, avoid_blockers: avoid_blockers)
          render json: TourApi::Routing.tour_route(@property, built, stop_ids: stop_ids, step_free: step_free, avoid_blockers: avoid_blockers)
        end

        def distances
          stop_ids = string_list_param(params[:stop_ids], loc: %w[body stop_ids], min: 1, max: 500)
          render json: TourApi::Routing.distances(@property, built, stop_ids: stop_ids)
        end
      end
    end
  end
end
