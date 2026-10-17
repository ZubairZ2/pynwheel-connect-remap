# frozen_string_literal: true

module Visitors
  # One visitor at one property: contact, ID check, the bookings (with the
  # cancelled ones), the visit sessions (`tour_histories`) with the stops
  # the app reported (`visited_stops` by `tour_key`) and the door events
  # (`lock_histories`), and a timeline. What the legacy Visitor Details page
  # (TourUsersController#show) reads, as JSON.
  class Profile
    def initialize(community, tour_user, base_url: nil)
      @community = community
      @visitor = tour_user
      @base_url = base_url
      @zone = ActiveSupport::TimeZone[Status.tz(community)] || ActiveSupport::TimeZone['UTC']
      @now = Time.now.in_time_zone(@zone)
      @query = Query.new(community)
    end

    def as_json(*)
      row = @query.rows.find { |r| r.visitor.id == @visitor.id }
      bookings = row ? row.bookings : []
      sessions = row ? row.sessions : []
      {
        visitor: visitor_json(row),
        bookings: bookings.map { |b| booking_json(b) },
        sessions: sessions.map { |h| session_json(h) },
        timeline: timeline(bookings, sessions),
        chat: chat_json,
        can_reset_stops: bookings.any? { |b| b.stops_list.present? } || Tour.where(community_id: community.id, tour_user_id: @visitor.id).exists?,
        time_zone: @zone.name
      }
    end

    private

      attr_reader :community

      def visitor_json(row)
        base = row ? @query.row_json(row) : { id: @visitor.id, name: @visitor.name, email: @visitor.email, phone: @visitor.phone_number, status: 'completed', flags: [], id_check: Status.id_check(@visitor, @now) }
        base.merge(
          first_name: @visitor.first_name, last_name: @visitor.last_name,
          desired_bedroom: @visitor.desired_bedroom, sms: @visitor.is_sms_enabled != false,
          selfie_url: Connect::UploadUrl.upload(@visitor, :image, @base_url, bucket: bucket),
          id_card_url: Connect::UploadUrl.upload(@visitor, :id_card, @base_url, bucket: bucket),
          id_mismatch: @visitor.id_selfie_mismatch == true,
          verification_type: community.community_tour&.verification_type,
          created_at: @visitor.created_at
        )
      end

      def bucket
        @bucket ||= Connect::UploadUrl.bucket_hint(community)
      end

      def booking_json(booking)
        status = Status.booking_status(booking, community, @now)
        {
          id: booking.id,
          status: status,
          tour_date: booking.tour_date,
          tour_time: booking.tour_time&.strftime('%H:%M'),
          booked_at: Status.booked_at(booking, @zone),
          property_tour_type: booking.property_tour_type,
          tour_type: Status.tour_type_key(booking),
          tour_type_label: Status::TYPE_LABEL[Status.tour_type_key(booking)],
          source: Status.source_label(booking.created_by),
          created_by: booking.created_by,
          created_at: booking.created_at,
          completed_at: booking.tour_completed_at,
          customized: booking.stops_list.present?,
          stops_list: Array(booking.stops_list),
          reminders: { day_before: booking.daily_email_sent, hour_before: booking.hourly_email_sent, missed: booking.missed_email_sent },
          desired_bedroom: booking.desired_bedroom,
          desired_move_in_date: booking.desired_move_in_date,
          cancelled_at: booking.respond_to?(:cancelled_at) ? booking.cancelled_at : nil,
          crm: { yardi: booking.yardirentcafe_appointment_id.presence, knock: booking.knock_appointment_id.presence, funnel: booking.funnel_appointment_id.presence, salesforce: booking.salesforce_tour_booking_id.presence }.compact
        }
      end

      def session_json(history)
        status = Status.visit_status(history, @now)
        stops = history.tour_key.present? ? VisitedStop.where(tour_key: history.tour_key).order(:id).to_a : []
        stop_names = TourStop.where(id: stops.map(&:tour_stop_id).compact).index_by(&:id)
        locks = LockHistory.where(tour_history_id: history.id).order(:occured_at, :id).to_a
        elapsed = Status.visit_elapsed_minutes(history, @now)
        {
          id: history.id,
          status: status,
          arrived: history.arrived,
          left: history.left,
          elapsed_minutes: elapsed,
          lengthy: history.lengthy_stay_email_sent == true || (status == 'in_progress' && elapsed.to_i > (community.community_tour&.tour_setting&.length_stay_limit || 45).to_i),
          onsite: history.tour_site != 'offsite',
          tour_type: history.tour_type,
          tour_status: history.tour_status,
          verified_by: history.verified_by,
          id_mismatch: history.id_mismatch == true,
          abandoned_at_stop: history.abandoned_tour_at_stop && stop_names[history.abandoned_tour_at_stop]&.name,
          lock_access_time: history.lock_access_time&.strftime('%H:%M'),
          stops: stops.map do |visited|
            {
              id: visited.id, tour_stop_id: visited.tour_stop_id, name: stop_names[visited.tour_stop_id]&.name.presence || "Stop #{visited.tour_stop_id}",
              stop_type: visited.stop_type, at: visited.event_time || visited.created_at, pin: visited.stop_pin.presence,
              note: visited.description.presence, image_url: visited.image.present? ? Connect::UploadUrl.upload(visited, :image, @base_url, bucket: bucket) : nil
            }
          end,
          lock_events: locks.map { |event| { event: event.event, at: event.occured_at || event.created_at, stop_name: event.stop_name, stop_type: event.stop_type } }
        }
      end

      def chat_json
        tour = community.community_tour
        room = tour && Chatroom.find_by(tour_user_id: @visitor.id, tour_id: tour.id)
        return { available: false } unless room

        { available: true, chatroom_id: room.id, messages: room.chats.order(:id).last(50).map { |chat| { who: chat.name, text: chat.message, at: chat.created_at } } }
      rescue StandardError
        { available: false }
      end

      def timeline(bookings, sessions)
        events = []
        bookings.each do |b|
          at = Status.booked_at(b, @zone)
          events << { at: b.created_at, title: "Booked · #{Status::TYPE_LABEL[Status.tour_type_key(b)]}#{at ? " for #{at.strftime('%a, %b %-d · %-I:%M %p')}" : ' · unscheduled'}", sub: "Created by #{Status.source_label(b.created_by)}" }
          events << { at: b.tour_completed_at, title: 'Tour completed', sub: 'Marked completed by the app' } if b.tour_completed_at.present?
          events << { at: b.cancelled_at, title: 'Booking cancelled', sub: nil } if b.respond_to?(:cancelled_at) && b.cancelled_at
          events << { at: at + 2.hours, title: 'Missed tour', sub: 'Missed-tour message sent' } if b.missed_email_sent && at
        end
        sessions.each do |h|
          events << { at: h.arrived, title: "Tour started#{h.tour_site == 'offsite' ? ' · remote' : ''}", sub: h.verified_by.present? ? "ID verified by #{h.verified_by}" : nil } if h.arrived
          events << { at: h.left, title: 'Tour ended', sub: nil } if h.left
          events << { at: (h.updated_at || h.arrived), title: 'Tour abandoned', sub: 'The app never reported an end' } if h.abandoned_tour_at_stop.present?
        end
        events.compact.select { |e| e[:at] }.sort_by { |e| -e[:at].to_i }.first(40)
      end
  end
end
