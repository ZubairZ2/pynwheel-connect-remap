# frozen_string_literal: true

module Bookings
  # The slots a prospect can book, as the scheduler widget offers them:
  #   days      Community#collect_disable_days (a weekday with no self or
  #             guided hours is closed)
  #   times     Community#collect_time_slots(stepping) (the self and guided
  #             hours merged, stepped by tour_settings.time_intervel)
  #   types     Community#fetch_tour_type_according_to_time (which hours the
  #             time falls in), less the types SchedualTours::Capacity removes
  # Today's times already passed in the property's time zone are left out.
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
      return { date: date.iso8601, closed: true, slots: [] } if closed_weekdays.include?(wday)

      times = Array(slot_times[wday])
      counter = nil
      slots = times.filter_map do |label|
        time = parse_label(label)
        next if time.nil?
        next if date == now.to_date && time_of_day(time) <= time_of_day(now)

        allowed = allowed_types_at(wday, label)
        counter ||= SchedualTours::Capacity::DayCounter.new(community, date, tour: tour, setting: setting, interval: interval_minutes) if tour && setting
        full = counter ? allowed & counter.limit_exceeded_types(time) : []
        types = allowed - full
        Slot.new(time: time.strftime('%H:%M'), label: time.strftime('%-I:%M %p'), types: types, full: full)
      end
      { date: date.iso8601, closed: slots.empty? && times.empty?, slots: slots.map(&:to_h) }
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
  end
end
