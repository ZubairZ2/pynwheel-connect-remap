# frozen_string_literal: true

module Bookings
  # The slots a prospect can book, as the scheduler widget offers them:
  #   days      Community#collect_disable_days (a weekday with no self or
  #             guided hours is closed)
  #   times     Community#collect_time_slots(stepping) (the self and guided
  #             hours merged, stepped by tour_settings.time_intervel)
  #   types     Community#fetch_tour_type_according_to_time (which hours the
  #             time falls in), less the types SchedualTours::Capacity removes
  # Today's times already passed in the property's time zone are left out,
  # and so are (October 20, 2026 Settings): times closer than the minimum
  # notice (`tour_settings.minimum_notice_minutes`), dates beyond the booking
  # horizon (`booking_horizon_days`, nil = unlimited), and the property's
  # dated closures (`tour_closures`, a whole day or a window of it); a buffer
  # (`buffer_minutes`) widens the capacity window (SchedualTours::Capacity).
  # A property whose availability a CRM manages (Yardi RentCafe, Knock,
  # Funnel) is flagged: the widget reads those slots from the CRM, and the
  # Pynwheel hours below are what the CMS stores, not what the widget shows.
  class Availability
    Slot = Struct.new(:time, :label, :types, :full, keyword_init: true)

    TYPE_LABELS = { 'self_tour' => 'App Guided Tour', 'guided_tour' => 'Person Guided Tour' }.freeze

    def initialize(community)
      @community = community
      @tz = community.get_time_zone
    end

    attr_reader :tz

    def managed_by
      return 'yardi' if community.use_yardi_as_lead?
      return 'knock' if community.is_knock_community?
      return 'funnel' if community.is_funnel_community?

      nil
    end

    # The tour, its setting and the slot interval are resolved once per
    # instance: `Community#community_tour` is a query every call, and a week
    # of slots asks for them hundreds of times (October 17, 2026 QA pass).
    def tour
      @tour ||= community.community_tour
    end

    def setting
      @setting ||= tour&.tour_setting
    end

    def interval_minutes
      @interval_minutes ||= SchedualTours::Capacity::INTERVALS[setting&.time_intervel] || 15
    end

    def buffer_minutes
      setting&.buffer_minutes.to_i
    end

    def minimum_notice_minutes
      setting&.minimum_notice_minutes.to_i
    end

    # nil when unlimited.
    def booking_horizon_days
      days = setting&.booking_horizon_days
      days.to_i.positive? ? days.to_i : nil
    end

    def last_bookable_date
      booking_horizon_days && now.to_date + booking_horizon_days
    end

    def beyond_horizon?(date)
      last = last_bookable_date
      last.present? && date > last
    end

    def now
      Time.now.in_time_zone(tz)
    end

    def closed_weekdays
      @closed_weekdays ||= Array(community.collect_disable_days)
    end

    # The slots of one date, with the tour types still open at each.
    def day(date)
      date = date.is_a?(Date) ? date : Date.parse(date.to_s)
      wday = date.wday
      return { date: date.iso8601, closed: true, beyond_horizon: true, slots: [] } if beyond_horizon?(date)

      closures = closures_on(date)
      all_day = closures.find(&:all_day?)
      return { date: date.iso8601, closed: true, closure: closure_json(all_day), slots: [] } if all_day
      return { date: date.iso8601, closed: true, slots: [] } if closed_weekdays.include?(wday)

      times = Array(slot_times[wday])
      counter = nil
      slots = times.filter_map do |label|
        time = parse_label(label)
        next if time.nil?
        next if date == now.to_date && time_of_day(time) <= time_of_day(now)
        next if before_notice?(date, time)
        next if closures.any? { |closure| within_closure?(closure, time) }

        allowed = allowed_types_at(wday, label)
        counter ||= SchedualTours::Capacity::DayCounter.new(community, date, tour: tour, setting: setting, interval: interval_minutes, buffer: buffer_minutes) if tour && setting
        full = counter ? allowed & counter.limit_exceeded_types(time) : []
        types = allowed - full
        Slot.new(time: time.strftime('%H:%M'), label: time.strftime('%-I:%M %p'), types: types, full: full)
      end
      result = { date: date.iso8601, closed: slots.empty? && times.empty?, slots: slots.map(&:to_h) }
      result[:closures] = closures.map { |closure| closure_json(closure) } if closures.any?
      result
    end

    # `days` days from `start`, with the rules the widget and the apps need to
    # explain the calendar (Connect::BookingController#availability and the
    # Tour App's booking availability answer this hash as is).
    def window(start, days)
      start = start.is_a?(Date) ? start : Date.parse(start.to_s)
      finish = start + days - 1
      {
        managed_by: managed_by,
        interval_minutes: interval_minutes,
        buffer_minutes: buffer_minutes,
        minimum_notice_minutes: minimum_notice_minutes,
        booking_horizon_days: booking_horizon_days,
        last_bookable_date: last_bookable_date&.iso8601,
        closed_weekdays: closed_weekdays,
        time_zone: tz,
        now: now,
        closures: closures_between(start, finish),
        days: (0...days).map { |offset| day(start + offset) }
      }
    end

    # The closures that touch `from..to`, as the Settings page lists them.
    def closures_between(from, to)
      community.tour_closures.between(from, to).map { |closure| closure_json(closure) }
    end

    def closure_json(closure)
      return nil if closure.nil?

      { id: closure.id, date: closure.date.iso8601, label: closure.label, closed_all_day: closure.all_day?, start_time: closure.all_day? ? nil : closure.start_time, end_time: closure.all_day? ? nil : closure.end_time }
    end

    # The open tour types at one date and time ("09:30" / "9:30 AM"), or [].
    def types_at(date, time)
      slot = day(date)[:slots].find { |row| row[:time] == normalize(time) }
      slot ? slot[:types] : []
    end

    def normalize(time)
      parsed = parse_label(time.to_s)
      parsed ? parsed.strftime('%H:%M') : nil
    end

    private

      attr_reader :community

      def slot_times
        @slot_times ||= community.collect_time_slots(interval_minutes) || {}
      rescue StandardError => e
        Rails.logger.warn("[Bookings::Availability] collect_time_slots failed for #{community.id}: #{e.class}: #{e.message}")
        {}
      end

      WEEK_DAYS = { 'Sunday' => 0, 'Monday' => 1, 'Tuesday' => 2, 'Wednesday' => 3, 'Thursday' => 4, 'Friday' => 5, 'Saturday' => 6 }.freeze

      # Community#fetch_tour_type_according_to_time (the widget's rule) with
      # the hours read once per lane instead of once per slot: a lane is open
      # at `label` on `wday` when the tour setting allows it and one of that
      # weekday's ranges contains the time, inclusive at both ends.
      def allowed_types_at(wday, label)
        return [] if setting.nil?

        time = parse_label(label)
        return [] if time.nil?

        types = []
        types << 'self_tour' if setting.allow_self_tour && open_in?(hours_for(:self)[wday], time)
        types << 'guided_tour' if setting.allow_guided_tour && open_in?(hours_for(:guided)[wday], time)
        types
      end

      def hours_for(lane)
        @hours ||= {}
        @hours[lane] ||= begin
          rows = (lane == :self ? community.opening_hours : community.guided_opening_hours).pluck(:day, :opening_time, :closing_time)
          rows.each_with_object(Hash.new { |h, k| h[k] = [] }) { |(day, open, close), acc| acc[WEEK_DAYS[day]] << [open, close] }
        end
      end

      def open_in?(ranges, time)
        Array(ranges).any? do |open, close|
          opening = parse_label(open)
          closing = parse_label(close)
          opening && closing && time >= opening && time <= closing
        end
      end

      def parse_label(label)
        Time.zone.parse(label.to_s)
      rescue ArgumentError
        nil
      end

      def time_of_day(time)
        time.hour * 60 + time.min
      end

      # Every closure from yesterday on, loaded once and grouped by date.
      def closures_on(date)
        @closures ||= community.tour_closures.where('date >= ?', now.to_date - 1).order(:start_time).to_a.group_by(&:date)
        Array(@closures[date])
      end

      def within_closure?(closure, time)
        return false if closure.all_day?

        opening = parse_label(closure.start_time)
        closing = parse_label(closure.end_time)
        opening && closing && time_of_day(time) >= time_of_day(opening) && time_of_day(time) < time_of_day(closing)
      end

      # A slot closer to now than the minimum notice, counted in whole minutes
      # of the property's clock.
      def before_notice?(date, time)
        notice = minimum_notice_minutes
        return false unless notice.positive?

        slot_minutes = (date - now.to_date).to_i * 1440 + time_of_day(time)
        slot_minutes < time_of_day(now) + notice
      end
  end
end
