# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # A visit (tour session) of the new Tour App at one property, written
      # to the legacy `tour_histories` / `visited_stops` / `lock_histories`
      # rows that Connect's Visitors and the legacy pages read (October 23, 2026):
      #   POST /properties/:id/visits                  check-in (Visits::Start)
      #   GET  /properties/:id/visits/:visit_id
      #   POST /properties/:id/visits/:visit_id/events the batch of stop and door events (Visits::Record)
      #   POST /properties/:id/visits/:visit_id/end    the end (Visits::End)
      # A visitor sees only their own visits; staff (Super Admin) may start
      # and drive a visit on behalf of a visitor of the property
      # (`tour_user_id`) while the app runs in staff mode. 404 `disabled`
      # while PYN_TOUR_VISITS is off.
      class VisitsController < PropertyController
        before_action :require_enabled!

        def create
          visitor = @auth.visitor? ? @auth.visitor : staff_visitor!
          attrs = params.permit(:client_visit_id, :booking_id, :tour_type, :started_at, :latitude, :longitude, :accuracy_m, :fix_at, :device_time_zone, :app_version).to_h
          result = ::Visits::Start.call!(@property, visitor, attrs, staff: @auth.user)
          render json: { success: true, visit: TourApi::Visits.visit_json(@property, result.visit, created: result.created, within_radius: result.within_radius, in_hours: result.in_hours, verification_required: result.verification_required,
                                                                            proximity: result.proximity, distance_m: result.distance_m, accuracy_m: result.accuracy_m),
                         booking: result.booking && TourApi::Visits.booking_json(@property, result.booking) }, status: result.created ? :created : :ok
        end

        def show
          visit = visit!
          booking = visit.schedual_tour_id && @property.schedual_tours.find_by(id: visit.schedual_tour_id)
          render json: { success: true, visit: TourApi::Visits.visit_json(@property, visit), booking: booking && TourApi::Visits.booking_json(@property, booking) }
        end

        def events
          visit = visit!
          events = params[:events]
          events = events.map { |row| row.respond_to?(:to_unsafe_h) ? row.to_unsafe_h : row } if events.is_a?(Array)
          device_id = string_param(params[:device_id], loc: %w[body device_id], max: 64, required: false)
          result = ::Visits::Record.call!(@property, visit, events, whodunnit: @auth.whodunnit, device_id: device_id)
          render json: { success: true, visit_id: visit.id }.merge(result), status: result[:rejected].empty? ? :ok : :multi_status
        end

        def finish
          visit = visit!
          attrs = params.permit(:ended_at, :reason, :abandoned_at_stop).to_h
          visit = ::Visits::End.call!(@property, visit, attrs, whodunnit: @auth.whodunnit)
          render json: { success: true, visit: TourApi::Visits.visit_json(@property, visit) }
        end

        private

          def require_enabled!
            raise TourApi::ApiError.new(404, 'disabled', 'Visit recording is not available on this server.') unless Connect::Flags.tour_visits_enabled?
          end

          # The visit, scoped to this property and, for a visitor, to their own rows.
          def visit!
            id = integer_param(params[:visit_id], loc: %w[path visit_id])
            scope = TourHistory.where(community_id: @property.id)
            scope = scope.where(tour_user_id: @auth.visitor.id) if @auth.visitor?
            scope.find_by(id: id) || raise(TourApi::ApiError.not_found('No such visit at this property.'))
          end

          # Staff mode: the visitor the admin is touring with, who must already
          # be a visitor of this property (a booking or a visit here).
          def staff_visitor!
            id = integer_param(params[:tour_user_id], loc: %w[body tour_user_id])
            raise TourApi::ApiError.validation([{ loc: %w[body tour_user_id], message: 'Field required' }]) if id.nil?

            visitor = TourUser.find_by(id: id)
            known = visitor && (@property.schedual_tours.where(tour_user_id: visitor.id).exists? || TourHistory.where(tour_user_id: visitor.id, community_id: @property.id).exists?)
            raise TourApi::ApiError.not_found('No such visitor at this property.') unless known

            visitor
          end
      end
    end
  end
end
