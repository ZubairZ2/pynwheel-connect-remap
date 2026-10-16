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

    def interval_minutes
      SchedualTours::Capacity.interval_minutes(community)
    end

    def now
      Time.now.in_time_zone(tz)
    end

    def closed_weekdays
      Array(community.collect_disable_days)
    end

    # The slots of one date, with the tour types still open at each.
    def day(date)
      date = date.is_a?(Date) ? date : Date.parse(date.to_s)
      wday = date.wday
      return { date: date.iso8601, closed: true, slots: [] } if closed_weekdays.include?(wday)

      times = Array(slot_times[wday])
      slots = times.filter_map do |label|
        time = parse_label(label)
        next if time.nil?
        next if date == now.to_date && time_of_day(time) <= time_of_day(now)

        allowed = community.fetch_tour_type_according_to_time(wday, label).map(&:first).uniq
        full = allowed & SchedualTours::Capacity.limit_exceeded_types(community, date, time)
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
