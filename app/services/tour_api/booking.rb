# frozen_string_literal: true

module TourApi
  # What the Tour app's Schedule screen reads: the property's booking rules
  # (Scheduling::Settings without the CMS-only parts) and the answer to a
  # booking it made (Bookings::Create::Result).
  module Booking
    module_function

    def settings(community, base_url: nil)
      full = Scheduling::Settings.new(community, base_url: base_url).as_json
      {
        property_id: community.id,
        time_zone: full[:time_zone_effective],
        scheduler_enabled: full[:scheduler_enabled],
        widget_live: full[:widget_live],
        salesforce: full[:salesforce],
        bookable: full[:widget_live] && !full[:salesforce],
        managed_by: full.dig(:crm, :managed_hours),
        gates: full[:gates],
        tour_types: full[:tour_types] && { self_tour: full[:tour_types][:self_tour], guided_tour: full[:tour_types][:guided_tour] },
        slot_interval_minutes: full[:slot_interval_minutes],
        only_scheduled_tour: full[:only_scheduled_tour],
        grace_period: full[:grace_period],
        length_stay_limit: full[:length_stay_limit],
        capacity: full[:capacity] && full[:capacity].slice(:enabled, :max_self_tour_users, :max_guided_tour_users),
        window: full[:window],
        closures: full[:closures],
        app: full[:app],
        hours: full[:hours].transform_values { |lanes| lanes.transform_values { |ranges| ranges.map { |r| r.slice(:open, :close) } } },
        form: full[:form] && full[:form].slice(:credit_card_required, :id_verification_fee, :visual_id_verification, :show_desired_bedroom, :show_desired_move_in_date,
                                               :marketing_source_required, :discovery_source, :sms_opt_in_default),
        link: full[:link] && full[:link].slice(:url, :live)
      }
    end

    def created(community, result)
      booking = result.booking
      visitor = result.visitor
      zone = Bookings::Availability.new(community)
      {
        booking: {
          id: booking.id,
          status: Visitors::Status.booking_status(booking, community, zone.now),
          tour_date: booking.tour_date&.iso8601,
          tour_time: booking.tour_time&.strftime('%H:%M'),
          tour_time_label: booking.tour_time&.strftime('%-I:%M %p'),
          end_time: booking.end_time&.strftime('%H:%M'),
          tour_type: booking.tour_type,
          property_tour_type: booking.property_tour_type,
          created_by: booking.created_by,
          rescheduled: result.rescheduled
        },
        visitor: { id: visitor.id, first_name: visitor.first_name, last_name: visitor.last_name, email: visitor.email, phone_number: visitor.phone_number },
        notifications: result.notifications
      }
    end
  end
end
