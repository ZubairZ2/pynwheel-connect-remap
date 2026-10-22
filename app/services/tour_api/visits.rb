# frozen_string_literal: true

module TourApi
  # What the Tour App reads of a visit and of a booking (October 23, 2026).
  module Visits
    module_function

    def visit_json(community, visit, now: nil, created: nil, within_radius: nil, in_hours: nil, verification_required: nil)
      now ||= ::Visits::Rules.now(community)
      minutes = ::Visits::Rules.access_minutes(community)
      status = Visitors::Status.visit_status(visit, now)
      {
        id: visit.id,
        status: status,
        tour_key: visit.tour_key,
        tour_type: visit.tour_type.presence || visit.tour_status,
        tour_site: visit.tour_site,
        booking_id: visit.schedual_tour_id,
        source: visit.source,
        started_at: Text.timestamp(visit.arrived),
        ended_at: Text.timestamp(visit.left),
        ended_reason: visit.ended_reason,
        active: status == 'in_progress',
        access_window: visit.arrived ? { starts_at: Text.timestamp(visit.arrived), ends_at: Text.timestamp(visit.arrived + minutes.minutes), minutes: minutes } : nil,
        within_radius: within_radius,
        in_hours: in_hours,
        location_received: visit.location_received == true,
        verification_required: verification_required.nil? ? ::Visits::Rules.verification_required?(community, visit.tour_user, now) : verification_required,
        events: VisitedStop.where(tour_history_id: visit.id).count,
        created: created
      }.compact
    end

    def booking_json(community, booking, now: nil)
      now ||= ::Visits::Rules.now(community)
      {
        id: booking.id,
        property_id: booking.community_id,
        status: Visitors::Status.booking_status(booking, community, now),
        tour_date: booking.tour_date&.iso8601,
        tour_time: booking.tour_time&.strftime('%H:%M'),
        tour_time_label: booking.tour_time&.strftime('%-I:%M %p'),
        end_time: booking.end_time&.strftime('%H:%M'),
        tour_type: booking.tour_type,
        property_tour_type: booking.property_tour_type,
        created_by: booking.created_by,
        is_tour_completed: booking.is_tour_completed == true,
        desired_bedroom: booking.desired_bedroom,
        desired_move_in_date: booking.desired_move_in_date&.iso8601
      }
    end

    # The visitor's bookings (every property, newest first) with the property named.
    def visitor_bookings(visitor, limit: 20)
      rows = SchedualTour.where(tour_user_id: visitor.id).where.not(community_id: nil).order(Arel.sql('coalesce(tour_date, created_at) desc'), id: :desc).limit(limit).to_a
      communities = Community.where(id: rows.map(&:community_id).uniq).index_by(&:id)
      rows.filter_map do |booking|
        community = communities[booking.community_id]
        next nil if community.nil?

        booking_json(community, booking).merge(property_name: community.name)
      end
    end
  end
end
