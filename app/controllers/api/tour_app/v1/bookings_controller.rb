# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The Pynwheel Tour app's Schedule screen on the property's real booking
      # rules (October 20, 2026): the same services Connect's Settings and
      # Visitors use, so the app, the CMS and the website widget agree.
      #   GET    /properties/:property_id/booking/settings      Scheduling::Settings, trimmed for the app
      #   GET    /properties/:property_id/booking/availability  Bookings::Availability#window (?date=YYYY-MM-DD&days=7)
      #   POST   /properties/:property_id/bookings              Bookings::Create, created_by "Tour App"
      #   GET    /properties/:property_id/bookings              the signed-in visitor's bookings here (October 23, 2026)
      #   PUT    /properties/:property_id/bookings/:booking_id  Bookings::Reschedule {tour_date, tour_time}
      #   DELETE /properties/:property_id/bookings/:booking_id  Bookings::Cancel
      # A signed-in visitor books as themselves: the name, email and phone
      # fields are ignored and the booking is theirs; staff book on behalf of
      # the visitor the fields describe, as before. A booking the rules refuse
      # is a 422 with the service's code (`slot_unavailable`, `slot_full`,
      # `invalid_visitor`, …); for the two slot errors `details.slots`
      # carries the day's current slots.
      class BookingsController < PropertyController
        CREATED_BY = 'Tour App'
        BOOKING_PARAMS = %i[tour_type property_tour_type tour_date tour_time first_name last_name email phone_number country_code
                            desired_bedroom desired_move_in_date is_sms_enabled marketing_source].freeze

        rescue_from Connect::DomainError do |error|
          status = error.status == :not_found ? 404 : 422
          render_api_error(TourApi::ApiError.new(status, error.code, error.message, details: error.extra.presence))
        end
        rescue_from Wayfinding::Invalid do |error|
          render_api_error(TourApi::ApiError.validation(error.errors.map { |row| { loc: ['body', row[:path]], message: row[:message] } }))
        end

        def settings
          return if not_modified?(TourApi::ConfigVersion.for(@property))

          render json: TourApi::Booking.settings(@property, base_url: request.base_url)
        end

        def availability
          availability = Bookings::Availability.new(@property)
          start = begin
            Date.iso8601(params[:date].to_s)
          rescue ArgumentError
            availability.now.to_date
          end
          days = params[:days].present? ? integer_param(params[:days], loc: %w[query days]).to_i : 7
          render json: availability.window(start, days.clamp(1, 31))
        end

        def create
          attrs = params.permit(*BOOKING_PARAMS).to_h
          result = Bookings::Create.call!(@property, attrs, user: @auth.user, visitor: @auth.visitor, request_ip: request.remote_ip, created_by: CREATED_BY)
          render json: TourApi::Booking.created(@property, result), status: :created
        end

        def index
          require_visitor!
          rows = @property.schedual_tours.where(tour_user_id: @auth.visitor.id).order(Arel.sql('coalesce(tour_date, created_at) desc'), id: :desc).limit(50)
          render json: { success: true, bookings: rows.map { |booking| TourApi::Visits.booking_json(@property, booking) } }
        end

        def reschedule
          booking = booking!
          result = Bookings::Reschedule.call!(@property, booking, params.permit(:tour_date, :tour_time).to_h, user: @auth.user)
          TourApi::Audit.record(@property, 'booking_rescheduled', whodunnit: @auth.whodunnit, payload: { booking_id: booking.id, tour_user_id: booking.tour_user_id, source: 'tour_app' }) if @auth.visitor?
          render json: { success: true, booking: TourApi::Visits.booking_json(@property, booking.reload), notifications: result[:notifications] }
        end

        def cancel
          booking = booking!
          raise TourApi::ApiError.unprocessable('completed', 'This visit is already completed.') if @auth.visitor? && booking.is_tour_completed

          Bookings::Cancel.call!(@property, booking, whodunnit: @auth.whodunnit, source: 'tour_app')
          render json: { success: true, cancelled: booking.id }
        end

        private

          # This property's booking; a visitor's own only.
          def booking!
            id = integer_param(params[:booking_id], loc: %w[path booking_id])
            scope = @property.schedual_tours.where.not(tour_user_id: nil)
            scope = scope.where(tour_user_id: @auth.visitor.id) if @auth.visitor?
            scope.find_by(id: id) || raise(TourApi::ApiError.not_found('No such booking at this property.'))
          end
      end
    end
  end
end
