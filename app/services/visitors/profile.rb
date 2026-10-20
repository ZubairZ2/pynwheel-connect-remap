# frozen_string_literal: true

module Visitors
  # One visitor at one property: contact, ID check, the bookings (with the
  # cancelled ones and their slot changes), the visit sessions
  # (`tour_histories`) with the stops the app reported (`visited_stops` by
  # `tour_key`, grouped per stop with the photos and notes taken there) and
  # the door events (`lock_histories`), the access codes the lock vendors
  # issued (Visitors::Access), the visitor's feedback, the guest cards sent
  # to the CRM (`prospects`), and a timeline of the recorded events. What
  # the legacy Visitor Details page (TourUsersController#show) reads, as
  # JSON, plus the rows it never showed.
  #
  # `include_codes:` — whether the caller may see access and property codes
  # (Connect: User#can_edit_map?); without it every code is reported as
  # present or absent only.
  class Profile
    TIMELINE_LIMIT = 80
    STOP_EVENTS_PER_SESSION = 25
    PRIVACY_EVENTS = %w[visitor_remove_pii visitor_delete visitor_reset_verification visitor_id_review visitor_reset_stops].freeze
    PRIVACY_TITLES = {
      'visitor_remove_pii' => 'Personal data removed', 'visitor_delete' => 'Visit data deleted at this property',
      'visitor_reset_verification' => 'ID verification reset', 'visitor_id_review' => 'ID reviewed', 'visitor_reset_stops' => 'Customized route reset'
    }.freeze
    CRM_PROVIDERS = { 'realpagesvc' => 'RealPage', 'psi' => 'Entrata', 'salesforce' => 'Salesforce', 'yardi' => 'Yardi', 'knock' => 'Knock', 'funnel' => 'Funnel' }.freeze

    def initialize(community, tour_user, base_url: nil, include_codes: false)
      @community = community
      @visitor = tour_user
      @base_url = base_url
      @include_codes = include_codes
      @zone = ActiveSupport::TimeZone[Status.tz(community)] || ActiveSupport::TimeZone['UTC']
      @now = Time.now.in_time_zone(@zone)
      @query = Query.new(community, visitor_id: tour_user.id)
    end

    def as_json(*)
      row = @query.rows.find { |r| r.visitor.id == @visitor.id }
      bookings = row ? row.bookings : []
      sessions = row ? row.sessions : []
      {
        visitor: visitor_json(row),
        bookings: bookings.map { |b| booking_json(b) },
        sessions: sessions.map { |h| session_json(h) },
        access: access.rows,
        feedback: feedback_json,
        crm_pushes: crm_pushes,
        timeline: timeline(bookings, sessions),
        chat: chat_json,
        can_reset_stops: bookings.any? { |b| b.stops_list.present? } || Tour.where(community_id: community.id, tour_user_id: @visitor.id).exists?,
        codes_visible: @include_codes,
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
          verification_required: community.community_tour&.visual_id_verification == true,
          verified_by: @visitor.verified_by.presence,
          property_code: property_code_json,
          created_at: @visitor.created_at
        )
      end

      # The property access code the legacy app asks for when restricted
      # access is on (TourUser#check_code_expiry): generated at tour start,
      # valid for the length-of-stay limit.
      def property_code_json
        enabled = community.community_tour&.tour_setting&.enable_restricted_property_access == true
        generated_at = @visitor.property_access_code_generated_at
        return { enabled: enabled, status: 'none', code: nil, generated_at: nil, expires_at: nil } if @visitor.property_access_code.blank? || generated_at.blank?

        expires_at = generated_at + stay_limit.minutes
        {
          enabled: enabled,
          status: enabled && expires_at > @now ? 'active' : 'expired',
          code: @include_codes ? @visitor.property_access_code.to_s : nil,
          generated_at: generated_at,
          expires_at: expires_at
        }
      end

      def bucket
        @bucket ||= Connect::UploadUrl.bucket_hint(community)
      end

      def grace
        @grace ||= Status.grace_minutes(community)
      end

      def stay_limit
        @stay_limit ||= (community.community_tour&.tour_setting&.length_stay_limit || 45).to_i
      end

      def access
        @access ||= Access.new(community, @visitor, now: @now, include_codes: @include_codes)
      end

      def changes
        @changes ||= Changes.reschedules(@query.rows.find { |r| r.visitor.id == @visitor.id }&.bookings || [])
      end

      def booking_json(booking)
        status = Status.booking_status(booking, community, @now, grace: grace)
        type = Status.tour_type_key(booking)
        {
          id: booking.id,
          status: status,
          status_label: Status::STATUS_LABEL[status],
          tour_date: booking.tour_date,
          tour_time: booking.tour_time&.strftime('%H:%M'),
          booked_at: Status.booked_at(booking, @zone),
          property_tour_type: booking.property_tour_type,
          tour_type: type,
          tour_type_label: Status::TYPE_LABEL[type],
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
          cancelled_by: booking.respond_to?(:cancelled_by) ? booking.cancelled_by : nil,
          history: (changes[booking.id] || []).map { |change| change.merge(from: change[:from].merge(at: slot_at(change[:from])), to: change[:to].merge(at: slot_at(change[:to]))) },
          crm: { yardi: booking.yardirentcafe_appointment_id.presence, knock: booking.knock_appointment_id.presence, funnel: booking.funnel_appointment_id.presence, salesforce: booking.salesforce_tour_booking_id.presence }.compact,
          crm_pushes: crm_of(booking)
        }
      end

      def slot_at(slot)
        return nil if slot[:tour_date].blank? || slot[:tour_time].blank?

        "#{slot[:tour_date]} #{slot[:tour_time]}".in_time_zone(@zone)
      end

      # The appointment ids the CRM integrations wrote on the booking: proof
      # the push happened, without a time of its own (the row carries none).
      def crm_of(booking)
        out = []
        out << { provider: 'yardi', label: 'Yardi RentCafe', id: booking.yardirentcafe_appointment_id, prospect_id: booking.yardirentcafe_prospect_id } if booking.yardirentcafe_appointment_id.present?
        out << { provider: 'knock', label: 'Knock', id: booking.knock_appointment_id, prospect_id: booking.knock_prospect_id } if booking.knock_appointment_id.present?
        out << { provider: 'funnel', label: 'Funnel', id: booking.funnel_appointment_id, prospect_id: booking.funnel_prospect_id } if booking.funnel_appointment_id.present?
        out << { provider: 'salesforce', label: 'Salesforce', id: booking.salesforce_tour_booking_id, name: booking.salesforce_tour_booking_name.presence } if booking.salesforce_tour_booking_id.present?
        out
      end

      def session_json(history)
        status = Status.visit_status(history, @now)
        visited, stop_names = visited_for(history)
        locks = LockHistory.where(tour_history_id: history.id).order(:occured_at, :id).to_a
        elapsed = Status.visit_elapsed_minutes(history, @now)
        stops = grouped_stops(visited, stop_names)
        {
          id: history.id,
          status: status,
          status_label: Status::STATUS_LABEL[status],
          arrived: history.arrived,
          left: history.left,
          elapsed_minutes: elapsed,
          lengthy: history.lengthy_stay_email_sent == true || (status == 'in_progress' && elapsed.to_i > stay_limit),
          lengthy_at: history.lengthy_stay_email_sent == true ? history.lengthy_stay : nil,
          onsite: history.tour_site != 'offsite',
          tour_type: history.tour_type,
          tour_status: history.tour_status,
          verified_by: history.verified_by,
          id_mismatch: history.id_mismatch == true,
          abandoned_at_stop: history.abandoned_tour_at_stop && stop_names[history.abandoned_tour_at_stop]&.name,
          lock_access_time: history.lock_access_time&.strftime('%H:%M'),
          desired_bedroom: history.desired_bedroom,
          counters: { availability: history.see_availability_counter, apply: history.apply_click_counter, price: history.price_opened_counter, notes: history.notes_opened_counter, camera: history.camera_opened_counter, pages: history.visited_pages_counter },
          stops: stops,
          lock_events: locks.map { |event| { event: event.event, at: event.occured_at || event.created_at, stop_name: event.stop_name, stop_type: event.stop_type } },
          access_ids: access.during(history).map { |row| row[:id] }
        }
      end

      # The stops the app reported for a session and their tour stops, read once
      # per session (the session panel and the timeline both need them).
      def visited_for(history)
        @visited ||= {}
        @visited[history.id] ||= begin
          visited = history.tour_key.present? ? VisitedStop.where(tour_key: history.tour_key).order(:id).to_a : []
          [visited, TourStop.where(id: visited.map(&:tour_stop_id).compact.uniq).index_by(&:id)]
        end
      end

      # One entry per stop in the order the app first reported it, with every
      # photo and note taken there. `at` is the first recorded event at the
      # stop and `next_at` the first event at the following stop; the app
      # records arrivals, never departures.
      def grouped_stops(visited, stop_names)
        groups = visited.group_by(&:tour_stop_id)
        order = visited.map(&:tour_stop_id).uniq
        entries = order.map do |tour_stop_id|
          rows = groups[tour_stop_id]
          at = rows.map { |row| Status.stop_instant(row, @zone) }.min
          stop = stop_names[tour_stop_id]
          {
            id: rows.first.id,
            tour_stop_id: tour_stop_id,
            name: stop&.name.presence || (tour_stop_id ? "Stop #{tour_stop_id}" : 'Unknown stop'),
            stop_type: rows.filter_map(&:stop_type).first || stop&.stop_type,
            at: at,
            next_at: nil,
            events: rows.size,
            pins: rows.filter_map { |row| Status.stop_code(row.stop_pin) }.uniq,
            pin: rows.filter_map { |row| Status.stop_code(row.stop_pin) }.first,
            instruction: rows.filter_map { |row| Status.stop_instruction(row.stop_pin) }.first,
            notes: rows.filter_map { |row| row.description.presence },
            note: rows.filter_map { |row| row.description.presence }.first,
            photos: rows.select { |row| row.image.present? }.filter_map { |row| Connect::UploadUrl.upload(row, :image, @base_url, bucket: bucket) },
            image_url: nil
          }
        end
        entries.each_with_index do |entry, index|
          entry[:next_at] = entries[index + 1]&.dig(:at)
          entry[:image_url] = entry[:photos].first
        end
        entries
      end

      def feedback_json
        feedback = Feedback.where(tour_user_id: @visitor.id, tour_id: Tour.where(community_id: community.id).select(:id)).order(:id).last
        return nil if feedback.nil?

        { rating: feedback.rating, comment: feedback.comment.presence, cancelled: feedback.is_cancelled == true, at: feedback.created_at }
      rescue StandardError
        nil
      end

      # The guest cards the tour end sent to the property's CRM / PMS
      # (TourHistory#save_prospect: RealPage, Entrata; Salesforce feedback).
      def crm_pushes
        Prospect.where(community_id: community.id, tour_user_id: @visitor.id).order(:id).last(20).map do |prospect|
          provider = prospect.crm_provider.presence || prospect.data_provider.presence
          { provider: provider, label: CRM_PROVIDERS[provider.to_s] || provider.to_s.humanize, at: prospect.created_at, status: prospect.sf_status.presence, booking_id: prospect.sf_booking_id.presence }
        end
      rescue StandardError
        []
      end

      def chat_json
        tour = community.community_tour
        room = tour && Chatroom.find_by(tour_user_id: @visitor.id, tour_id: tour.id)
        return { available: false } unless room

        { available: true, chatroom_id: room.id, messages: room.chats.order(:id).last(50).map { |chat| { who: chat.name, text: chat.message, at: chat.created_at } } }
      rescue StandardError
        { available: false }
      end

      # The Connect privacy and review actions on this visitor at this
      # property (the audit rows Connect::VisitorsController writes). The
      # legacy pages leave no such trace.
      def privacy_events
        PaperTrail::Version.where(item_type: 'Community', item_id: community.id, event: PRIVACY_EVENTS).order(id: :desc).limit(200).filter_map do |version|
          payload = JSON.parse(version.object.to_s) rescue nil
          next nil unless payload.is_a?(Hash) && payload['tour_user_id'].to_i == @visitor.id

          sub = case version.event
                when 'visitor_remove_pii' then "Fields: #{Array(payload['fields']).join(', ')}"
                when 'visitor_id_review' then payload['mismatch'] ? 'Marked as a mismatch' : 'Marked as a match'
                when 'visitor_reset_verification' then payload['verification_type'].present? ? "#{payload['verification_type']} cleared" : nil
                end
          { at: version.created_at, title: PRIVACY_TITLES[version.event], sub: [sub, version.whodunnit.present? ? 'by staff' : nil].compact.join(' · ').presence, kind: 'privacy' }
        end
      rescue StandardError
        []
      end

      def timeline(bookings, sessions)
        events = []
        bookings.each do |b|
          at = Status.booked_at(b, @zone)
          type_label = Status::TYPE_LABEL[Status.tour_type_key(b)]
          events << { at: b.created_at, title: "Booked · #{type_label}#{at ? " for #{at.strftime('%a, %b %-d · %-I:%M %p')}" : ' · unscheduled'}", sub: "Created by #{Status.source_label(b.created_by)}", kind: 'booking' }
          (changes[b.id] || []).each do |change|
            from = slot_at(change[:from])
            to = slot_at(change[:to])
            events << { at: change[:at], title: "Rescheduled · #{from ? from.strftime('%b %-d · %-I:%M %p') : 'unscheduled'} → #{to ? to.strftime('%b %-d · %-I:%M %p') : 'unscheduled'}",
                        sub: change[:by].present? ? 'Changed by staff' : 'Changed through the booking form', kind: 'booking' }
          end
          crm_of(b).each { |push| events << { at: b.created_at, title: "Appointment booked in #{push[:label]}", sub: "#{push[:label]} id #{push[:id]}", kind: 'crm' } }
          events << { at: b.tour_completed_at, title: 'Tour completed', sub: 'Marked completed by the app', kind: 'visit' } if b.tour_completed_at.present?
          events << { at: b.cancelled_at, title: 'Booking cancelled', sub: b.respond_to?(:cancelled_by) && b.cancelled_by.present? ? 'Cancelled by staff' : nil, kind: 'booking' } if b.respond_to?(:cancelled_at) && b.cancelled_at
          if at && !b.is_tour_completed && !(b.respond_to?(:cancelled?) && b.cancelled?) && at + grace.minutes <= @now
            events << { at: at + grace.minutes, title: 'Missed · no tour started', sub: b.missed_email_sent ? 'Missed-tour message sent' : nil, kind: 'booking' }
          end
        end
        sessions.each do |h|
          events << { at: h.arrived, title: "Tour started#{h.tour_site == 'offsite' ? ' · remote' : ''}", sub: h.verified_by.present? ? "ID verified by #{h.verified_by}" : nil, kind: 'visit' } if h.arrived
          events << { at: h.lengthy_stay, title: 'Lengthy stay alert sent', sub: "On site longer than #{stay_limit} min", kind: 'visit' } if h.lengthy_stay_email_sent == true && h.lengthy_stay.present?
          events << { at: h.left, title: 'Tour ended', sub: nil, kind: 'visit' } if h.left
          events << { at: (h.updated_at || h.arrived), title: 'Tour abandoned', sub: 'The app never reported an end', kind: 'visit' } if h.abandoned_tour_at_stop.present?
          if h.tour_key.present?
            grouped_stops(*visited_for(h)).first(STOP_EVENTS_PER_SESSION).each do |stop|
              events << { at: stop[:at], title: "Arrived at #{stop[:name]}", sub: stop[:pin] ? "Code #{@include_codes ? stop[:pin] : '••••'} shown" : nil, kind: 'stop' }
            end
          end
          LockHistory.where(tour_history_id: h.id).order(:occured_at, :id).each do |event|
            events << { at: event.occured_at || event.created_at, title: "Door #{event.event.to_s.tr('_', ' ').presence || 'event'} · #{event.stop_name}", sub: nil, kind: 'door' }
          end
        end
        access.rows.group_by { |row| [row[:vendor], row[:issued_at]&.to_i.to_i / 60] }.each_value do |rows|
          first = rows.first
          failed = rows.count { |row| row[:status] == 'failed' }
          names = rows.filter_map { |row| row[:target_name] }.uniq.first(4).join(', ')
          title = failed == rows.size ? "#{first[:vendor_label]} access failed" : "#{rows.size} #{first[:vendor_label]} #{rows.size == 1 ? 'access' : 'accesses'} issued"
          events << { at: first[:issued_at], title: title, sub: [names.presence, failed.positive? && failed < rows.size ? "#{failed} failed" : nil].compact.join(' · ').presence, kind: 'access' }
        end
        %w[Authenteq CheckpointID].each do |provider|
          at = provider == 'Authenteq' ? (@visitor.is_authentiq_verified ? @visitor.authentiq_verified_at : nil) : (@visitor.is_checkpoint_verified ? @visitor.checkpoint_verified_at : nil)
          events << { at: at, title: "ID verified by #{provider}", sub: 'Valid for 30 days', kind: 'id' } if at.present?
        end
        if (feedback = feedback_json)
          events << { at: feedback[:at], title: feedback[:cancelled] ? 'Feedback dismissed' : "Feedback left#{feedback[:rating] ? " · #{feedback[:rating].to_f.round(1)} / 5" : ''}", sub: feedback[:comment], kind: 'feedback' }
        end
        crm_pushes.each { |push| events << { at: push[:at], title: "Guest card sent to #{push[:label]}", sub: push[:status], kind: 'crm' } }
        events.concat(privacy_events)
        events.compact.select { |e| e[:at] }.sort_by { |e| -e[:at].to_i }.first(TIMELINE_LIMIT)
      end
  end
end
