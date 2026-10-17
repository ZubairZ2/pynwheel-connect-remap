# frozen_string_literal: true

module Visitors
  # The Visitors list of a property: one row per visitor (`tour_users`,
  # matched to the property through its bookings — `schedual_tours` — and
  # its visits — `tour_histories` of the property's tours), with the status,
  # type, flags and source the design shows, filtered and paged in Ruby
  # after the rows are built (the status is derived, not stored).
  class Query
    STATUSES = %w[all upcoming in_progress completed missed cancelled].freeze
    TYPES = %w[all self guided virtual walkin].freeze
    RANGES = %w[all today next7 last7].freeze
    PER_DEFAULT = 25
    PER_MAX = 100
    BOOKING_LIMIT = 3000
    HISTORY_LIMIT = 5000

    Row = Struct.new(:visitor, :bookings, :sessions, :status, :when_at, :type, :source, :flags, :id_check, keyword_init: true)

    # `visitor_id:` scopes the bookings and visits to one visitor (the profile
    # and the writes need one row, not the whole property).
    def initialize(community, filters = {}, visitor_id: nil)
      @community = community
      @visitor_id = visitor_id
      @filters = filters.to_h.with_indifferent_access
      @zone = ActiveSupport::TimeZone[Status.tz(community)] || ActiveSupport::TimeZone['UTC']
      @now = Time.now.in_time_zone(@zone)
    end

    attr_reader :now

    def as_json(*)
      filtered = filtered_rows
      status = status_filter
      visible = status == 'all' ? filtered : filtered.select { |row| row.status == status }
      page = [@filters[:page].to_i, 1].max
      per = (@filters[:per].presence || PER_DEFAULT).to_i.clamp(1, PER_MAX)
      paged = visible.slice((page - 1) * per, per) || []
      {
        rows: paged.map { |row| row_json(row) },
        counts: STATUSES.each_with_object({}) { |key, out| out[key] = key == 'all' ? filtered.size : filtered.count { |row| row.status == key } },
        pagination: { page: page, per: per, total: visible.size, pages: [(visible.size.to_f / per).ceil, 1].max },
        on_site: on_site_json,
        coming_today: coming_today_count,
        time_zone: @zone.name,
        now: now,
        stay_limit_minutes: stay_limit,
        filters: { status: status, type: type_filter, range: range_filter, q: @filters[:q].to_s }
      }
    end

    # Every row that matches the search, type and range filters (the status chips count these).
    def filtered_rows
      @filtered_rows ||= rows.select { |row| matches?(row) }.sort_by { |row| [-row.when_at.to_i, row.visitor.id] }
    end

    def rows
      @rows ||= visitors.map { |visitor| build_row(visitor) }
    end

    def row_json(row)
      visitor = row.visitor
      removed = visitor.email.to_s == 'Removed at Consumer Request' || visitor.first_name.to_s == 'Removed at Consumer Request'
      {
        id: visitor.id,
        name: display_name(visitor),
        initials: removed ? '—' : initials(visitor),
        email: visitor.email,
        phone: visitor.phone_number,
        removed: removed,
        when_at: row.when_at,
        status: row.status,
        type: row.type,
        type_label: Status::TYPE_LABEL[row.type],
        tours: row.sessions.size,
        flags: row.flags,
        id_check: row.id_check,
        source: row.source,
        sms: visitor.is_sms_enabled != false
      }
    end

    private

      attr_reader :community

      def status_filter
        STATUSES.include?(@filters[:status].to_s) ? @filters[:status].to_s : 'all'
      end

      def type_filter
        TYPES.include?(@filters[:type].to_s) ? @filters[:type].to_s : 'all'
      end

      def range_filter
        RANGES.include?(@filters[:range].to_s) ? @filters[:range].to_s : 'all'
      end

      def matches?(row)
        return false if type_filter != 'all' && row.type != type_filter

        q = @filters[:q].to_s.strip.downcase
        if q.present?
          hay = [row.visitor.name, row.visitor.first_name, row.visitor.last_name, row.visitor.email, row.visitor.phone_number].compact.join(' ').downcase
          return false unless hay.include?(q)
        end
        day = row.when_at.in_time_zone(@zone).to_date
        today = now.to_date
        case range_filter
        when 'today' then day == today
        when 'next7' then day >= today && day <= today + 7
        when 'last7' then day <= today && day >= today - 7
        else true
        end
      end

      # Resolved once per query: both go through `community_tour` (a query per
      # call) and are needed for every booking and visit of the list.
      def stay_limit
        @stay_limit ||= (community.community_tour&.tour_setting&.length_stay_limit || 45).to_i
      end

      def grace
        @grace ||= Status.grace_minutes(community)
      end

      def bookings
        @bookings ||= begin
          scope = community.schedual_tours.where.not(tour_user_id: nil)
          scope = scope.where(tour_user_id: @visitor_id) if @visitor_id
          cancelled = Cancelled.for(community)
          cancelled = cancelled.select { |booking| booking.tour_user_id == @visitor_id } if @visitor_id
          scope.order(Arel.sql('coalesce(tour_date, created_at) desc, id desc')).limit(BOOKING_LIMIT).to_a + cancelled
        end
      end

      def tour_ids
        @tour_ids ||= Tour.where(community_id: community.id).pluck(:id)
      end

      # The property's visits, newest first, bounded like the bookings are
      # (HISTORY_LIMIT): a property with years of visits is not loaded whole.
      def histories
        @histories ||= begin
          scope = TourHistory.where(tour_id: tour_ids).or(TourHistory.where(community_id: community.id)).where.not(tour_user_id: nil)
          scope = scope.where(tour_user_id: @visitor_id) if @visitor_id
          scope.order(arrived: :desc, id: :desc).limit(HISTORY_LIMIT).to_a
        end
      end

      def visitors
        @visitors ||= begin
          ids = (bookings.map(&:tour_user_id) + histories.map(&:tour_user_id)).compact.uniq
          ids &= [@visitor_id] if @visitor_id
          TourUser.where(id: ids).to_a
        end
      end

      def bookings_by_visitor
        @bookings_by_visitor ||= bookings.group_by(&:tour_user_id)
      end

      def histories_by_visitor
        @histories_by_visitor ||= histories.group_by(&:tour_user_id)
      end

      def build_row(visitor)
        vb = (bookings_by_visitor[visitor.id] || []).sort_by { |b| [-(Status.booked_at(b, @zone) || b.created_at).to_i, -b.id] }
        vs = (histories_by_visitor[visitor.id] || []).reject { |h| h.history == true }
        statuses = vb.map { |b| [b, Status.booking_status(b, community, now, grace: grace)] }
        active = vs.find { |h| Status.visit_status(h, now) == 'in_progress' }
        upcoming = statuses.select { |_b, st| st == 'upcoming' }.map(&:first).sort_by { |b| (Status.booked_at(b, @zone) || now + 1000.years).to_i }
        status, when_at = if active
                            ['in_progress', active.arrived]
                          elsif upcoming.any?
                            ['upcoming', Status.booked_at(upcoming.first, @zone) || upcoming.first.created_at]
                          else
                            latest_booking = statuses.first
                            latest_visit = vs.first
                            if latest_visit && (latest_booking.nil? || latest_visit.arrived.to_i >= (Status.booked_at(latest_booking[0], @zone) || latest_booking[0].created_at).to_i)
                              [Status.visit_status(latest_visit, now) == 'abandoned' ? 'abandoned' : 'completed', latest_visit.arrived || latest_visit.created_at]
                            elsif latest_booking
                              [latest_booking[1], Status.booked_at(latest_booking[0], @zone) || (latest_booking[0].respond_to?(:cancelled_at) ? latest_booking[0].cancelled_at : latest_booking[0].created_at)]
                            else
                              ['completed', visitor.created_at]
                            end
                          end
        status = 'completed' if status == 'abandoned'
        type = if vb.empty? then 'walkin' else Status.tour_type_key(vb.first) end
        flags = []
        vs.each do |h|
          elapsed = Status.visit_elapsed_minutes(h, now)
          flags << { key: 'lengthy_stay', label: 'Lengthy stay', variant: 'warn' } if Status.visit_status(h, now) == 'in_progress' && elapsed && elapsed > stay_limit
          flags << { key: 'abandoned', label: 'Tour abandoned', variant: 'warn' } if Status.visit_status(h, now) == 'abandoned' && h.abandoned_tour_at_stop.present?
        end
        flags << { key: 'id_mismatch', label: 'ID mismatch', variant: 'crit' } if visitor.id_selfie_mismatch
        flags << { key: 'customized', label: 'Customized tour', variant: 'info' } if upcoming.any? { |b| b.stops_list.present? }
        flags << { key: 'removed', label: 'Removed at consumer request', variant: 'neutral' } if visitor.email.to_s == 'Removed at Consumer Request'
        flags.uniq! { |f| f[:key] }
        Row.new(visitor: visitor, bookings: vb, sessions: vs, status: status, when_at: when_at || now, type: type,
                source: vb.empty? ? 'Walk-in' : Status.source_label(vb.first.created_by), flags: flags, id_check: Status.id_check(visitor, now))
      end

      def display_name(visitor)
        if visitor.first_name.present? || visitor.last_name.present?
          [visitor.last_name, visitor.first_name].compact_blank.join(', ')
        else
          visitor.name.presence || visitor.email
        end
      end

      def initials(visitor)
        [visitor.first_name.to_s[0], visitor.last_name.to_s[0]].compact_blank.join.upcase.presence || visitor.name.to_s[0].to_s.upcase.presence || '?'
      end

      def on_site_json
        rows.select { |row| row.status == 'in_progress' }.map do |row|
          session = row.sessions.find { |h| Status.visit_status(h, now) == 'in_progress' }
          elapsed = Status.visit_elapsed_minutes(session, now)
          {
            id: row.visitor.id, name: display_name(row.visitor), initials: initials(row.visitor), type: row.type, type_label: Status::TYPE_LABEL[row.type],
            started_at: session.arrived, elapsed_minutes: elapsed, lengthy: elapsed.to_i > stay_limit,
            last_stop: last_stop_name(session), onsite: session.tour_site != 'offsite', history_id: session.id
          }
        end.sort_by { |row| row[:started_at].to_i }
      end

      def last_stop_name(session)
        return nil if session.tour_key.blank?

        visited = VisitedStop.where(tour_key: session.tour_key).order(:id).last
        stop = visited&.tour_stop_id && TourStop.find_by(id: visited.tour_stop_id)
        stop&.name.presence
      end

      def coming_today_count
        today = now.to_date
        rows.sum { |row| row.bookings.count { |b| Status.booking_status(b, community, now, grace: grace) == 'upcoming' && b.tour_date == today } }
      end
  end
end
