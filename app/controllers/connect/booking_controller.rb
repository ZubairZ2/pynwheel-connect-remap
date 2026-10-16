# frozen_string_literal: true

module Connect
  # The Tour Setup settings of Scheduling, Booking Form and Booking Link
  # (Scheduling::Settings) and the slots a date offers (Bookings::Availability).
  #   GET /communities/:community_id/connect/booking.json
  #   GET /communities/:community_id/connect/booking/availability.json?date=YYYY-MM-DD[&days=7]
  #   PUT /communities/:community_id/connect/booking/rules.json   {allow_self_tour, …}
  #   PUT /communities/:community_id/connect/booking/hours.json   {hours: {self: {...}, guided: {...}}}
  #   PUT /communities/:community_id/connect/booking/form.json    {credit_card_required, …, button: {...}}
  class BookingController < BaseController
    CONNECT_READ_ACTIONS = %w[show availability].freeze
    CONNECT_WRITE_ACTIONS = %w[update_rules update_hours update_form].freeze

    def show
      render_connect(settings.as_json)
    end

    def availability
      availability = Bookings::Availability.new(@community)
      start = begin
        Date.parse(params[:date].to_s)
      rescue ArgumentError
        availability.now.to_date
      end
      days = params[:days].to_i.clamp(1, 31)
      render_connect(
        managed_by: availability.managed_by,
        interval_minutes: availability.interval_minutes,
        closed_weekdays: availability.closed_weekdays,
        time_zone: availability.tz,
        now: availability.now,
        days: (0...days).map { |offset| availability.day(start + offset) }
      )
    end

    def update_rules
      render_write(settings.update_rules!(params.permit(:allow_self_tour, :allow_guided_tour, :allow_virtual_tour, :slot_interval_minutes, :do_limit_max_tour, :limit_max_tour,
                                                        :max_self_tour_users, :max_guided_tour_users, :max_virtual_tour_users, :only_scheduled_tour, :grace_period,
                                                        :scheduler_enabled, :length_stay_limit).to_h, user: current_user))
    end

    def update_hours
      hours = params[:hours].respond_to?(:to_unsafe_h) ? params[:hours].to_unsafe_h : params[:hours].to_h
      render_write(settings.update_hours!(hours, user: current_user))
    end

    def update_form
      attrs = params.permit(:credit_card_required, :id_verification_fee, :visual_id_verification, :show_desired_bedroom, :show_desired_move_in_date, :marketing_source_required,
                            button: %i[text color width height font font_size]).to_h
      render_write(settings.update_form!(attrs, user: current_user))
    end

    private

      def settings
        Scheduling::Settings.new(@community)
      end

      def render_write(data)
        render json: Connect::ResponseEnvelope.new(data: data, meta: connect_write_meta).as_json
      end
  end
end
