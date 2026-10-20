# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The Pynwheel Tour app's Schedule screen on the property's real booking
      # rules (October 20, 2026): the same services Connect's Settings and
      # Visitors use, so the app, the CMS and the website widget agree.
      #   GET  /properties/:property_id/booking/settings      Scheduling::Settings, trimmed for the app
      #   GET  /properties/:property_id/booking/availability  Bookings::Availability#window (?date=YYYY-MM-DD&days=7)
      #   POST /properties/:property_id/bookings              Bookings::Create, created_by "Tour App"
      # A booking the rules refuse is a 422 with the service's code
      # (`slot_unavailable`, `slot_full`, `invalid_visitor`, …); for the two
      # slot errors `details.slots` carries the day's current slots.
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
          render json: TourApi::Booking.settings(@property)
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
          result = Bookings::Create.call!(@property, attrs, user: @auth.user, request_ip: request.remote_ip, created_by: CREATED_BY)
          render json: TourApi::Booking.created(@property, result), status: :created
        end
      end
    end
  end
end
