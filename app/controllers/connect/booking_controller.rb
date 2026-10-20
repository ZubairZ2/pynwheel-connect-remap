# frozen_string_literal: true

module Connect
  # The Tour Setup settings of Scheduling, Booking Form and Booking Link
  # (Scheduling::Settings) and the slots a date offers (Bookings::Availability).
  #   GET /communities/:community_id/connect/booking.json
  #   GET /communities/:community_id/connect/booking/availability.json?date=YYYY-MM-DD[&days=7]
  #   PUT /communities/:community_id/connect/booking/rules.json   {allow_self_tour, …}
  #   PUT /communities/:community_id/connect/booking/hours.json   {hours: {self: {...}, guided: {...}}}
  #   PUT /communities/:community_id/connect/booking/form.json    {credit_card_required, …, app: {...}, button: {...}}
  #   PUT /communities/:community_id/connect/booking/closures.json {closures: [{date, label, closed_all_day, start_time, end_time}]}
  class BookingController < BaseController
    CONNECT_READ_ACTIONS = %w[show availability].freeze
    CONNECT_WRITE_ACTIONS = %w[update_rules update_hours update_form update_closures].freeze

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
      render_connect(availability.window(start, days))
    end

    def update_rules
      render_write(settings.update_rules!(params.permit(:allow_self_tour, :allow_guided_tour, :allow_virtual_tour, :slot_interval_minutes, :do_limit_max_tour, :limit_max_tour,
                                                        :max_self_tour_users, :max_guided_tour_users, :max_virtual_tour_users, :only_scheduled_tour, :grace_period,
                                                        :scheduler_enabled, :length_stay_limit, :buffer_minutes, :minimum_notice_minutes, :booking_horizon_days).to_h, user: current_user))
    end

    def update_hours
      hours = params[:hours].respond_to?(:to_unsafe_h) ? params[:hours].to_unsafe_h : params[:hours].to_h
      render_write(settings.update_hours!(hours, user: current_user))
    end

    def update_form
      attrs = params.permit(:credit_card_required, :id_verification_fee, :visual_id_verification, :show_desired_bedroom, :show_desired_move_in_date, :marketing_source_required,
                            app: %i[after_hours_label allow_shorter_tour party_size_limit ask_unit show_text_booking],
                            button: %i[text color text_color icon width height font font_size]).to_h
      render_write(settings.update_form!(attrs, user: current_user))
    end

    def update_closures
      rows = params[:closures].respond_to?(:to_unsafe_h) ? params[:closures].to_unsafe_h : params[:closures]
      rows = rows.values if rows.is_a?(Hash)
      render_write(settings.update_closures!(Array(rows).map { |row| row.respond_to?(:to_unsafe_h) ? row.to_unsafe_h : row.to_h }, user: current_user))
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
