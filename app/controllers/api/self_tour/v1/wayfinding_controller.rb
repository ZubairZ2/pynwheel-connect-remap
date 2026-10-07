# frozen_string_literal: true

module Api
  module SelfTour
    module V1
      # The Tour App's wayfinding API: the property's graph, a route between
      # two places, and the whole tour's route, all computed in Rails
      # (`Wayfinding::GraphBuilder` / `RouteService`) from the persisted
      # graph. Read-only - unlike `CommunitiesController#start_tour` there is
      # no after_action and nothing is written - versioned, and cacheable
      # (ETag = `Wayfinding::GraphVersion`).
      class WayfindingController < BaseController
        include TokenAuthorization

        rescue_from ActiveRecord::RecordNotFound do
          render json: { success: false, error: { code: 'not_found', message: 'No such property.' } }, status: :not_found
        end

        before_action :require_tour!

        def show
          version = graph_version
          return if not_modified?(version)

          json = Rails.cache.fetch(['wf-graph', @community.id, version, request.base_url], expires_in: 12.hours) do
            Wayfinding::GraphSerializer.new(Wayfinding::GraphBuilder.new(@community).build, version: version, base_url: request.base_url).as_json
          end
          render json: json
        end

        def route
          version = graph_version
          service = Wayfinding::RouteService.new(@community, from: params[:from].to_s, to: params[:to].to_s, step_free: step_free?, avoid_blockers: avoid_blockers?,
                                                 from_floor: params[:from_floor].presence, to_floor: params[:to_floor].presence)
          result = service.call
          render json: Wayfinding::RouteSerializer.new(result, version: version, step_free: step_free?, avoid_blockers: avoid_blockers?).as_json, status: result.ok ? :ok : :unprocessable_entity
        end

        def tour_route
          version = graph_version
          result = Wayfinding::RouteService.new(@community, step_free: step_free?, avoid_blockers: avoid_blockers?).tour
          render json: Wayfinding::RouteSerializer.new(result, version: version, step_free: step_free?, avoid_blockers: avoid_blockers?).as_json, status: result.ok ? :ok : :unprocessable_entity
        end

        private

          def require_tour!
            return if Connect::ProductState.tour?(@community)

            render json: { success: false, error: { code: 'wayfinding_disabled', message: 'This property has no Self-Guided Tour.' } }, status: :unprocessable_entity
          end

          def graph_version
            Wayfinding::GraphVersion.for(@community)
          end

          # `stale?` answers 304 itself when the client's ETag is current.
          def not_modified?(version)
            response.headers['Cache-Control'] = 'private, max-age=0, must-revalidate'
            !stale?(etag: version, public: false)
          end

          def step_free?
            %w[1 true yes].include?(params[:step_free].to_s.downcase)
          end

          def avoid_blockers?
            !%w[0 false no].include?(params[:avoid_blockers].to_s.downcase)
          end
      end
    end
  end
end
