# frozen_string_literal: true

module SchedualTours
  # The per-slot booking limits of the scheduler widget
  # (SchedualToursController#get_tour_type / #check_limit, October 2026: the
  # rule moved here so the Connect availability and bookings apply the same
  # one). Counts the bookings with a visitor in the window
  # [slot − (interval − 1), slot + (interval − 1)] of the day and answers the
  # tour types the widget removes from the slot:
  #   "virtual_tour" when `limit_max_tour` is reached by every non-virtual booking,
  #   "self_tour"    when `tours.max_self_tour_users` is reached by self tours,
  #   "guided_tour"  when `tours.max_guided_tour_users` is reached by guided tours,
  # each only while `tour_settings.do_limit_max_tour` is on.
  module Capacity
    INTERVALS = { '15 min' => 15, '30 min' => 30, '1 hr' => 60, '2 hrs' => 120 }.freeze

    module_function

    def interval_minutes(community)
      INTERVALS[community.community_tour&.tour_setting&.time_intervel] || 15
    end

    # `stepping` as the widget computes it: the interval less one minute.
    def stepping(community)
      interval_minutes(community) - 1
    end

    # The buffer between tours (Settings › Tour types & slots), 0 when unset.
    def buffer_minutes(community)
      community.community_tour&.tour_setting&.buffer_minutes.to_i
    end

    # Half the counting window: the interval plus the buffer, less one minute.
    def window_minutes(community)
      stepping(community) + buffer_minutes(community)
    end

    def window_counts(community, date, time)
      step = window_minutes(community)
      slot = time.is_a?(String) ? Time.zone.parse(time) : time
      before = slot - step.minutes
      after = slot + step.minutes
      scope = community.schedual_tours.where(tour_date: date, tour_time: before..after).where.not(tour_user_id: nil)
      {
        total: scope.where.not(tour_type: 'virtual_tour').count,
        total_per_day: community.schedual_tours.where(tour_date: date).where.not(tour_user_id: nil, tour_type: 'virtual_tour').count,
        self_tour: scope.where(tour_type: 'self_tour').count,
        guided: scope.where(tour_type: 'guided_tour').count
      }
    end

    def limit_exceeded_types(community, date, time)
      counts = window_counts(community, date, time)
      check_limit(nil, counts[:total], counts[:total_per_day], counts[:self_tour], counts[:guided], community)
    end

    # The widget's rule: `community.community_tour` is a query each time it is
    # read, so the tour and its setting are resolved once here (a missing tour
    # raises NoMethodError, as the original inline rule did) and the rule
    # itself lives in `limits_for`.
    def check_limit(tour_type, total_count, total_count_per_day, self_tour_count, guided_count, community)
      tour = community.community_tour
      limits_for(tour, tour.tour_setting, total_count, total_count_per_day, self_tour_count, guided_count)
    end

    # The widget's rule, verbatim, on a resolved tour and tour setting.
    def limits_for(tour, setting, total_count, _total_count_per_day, self_tour_count, guided_count)
      limit_type = []

      if (setting.do_limit_max_tour && setting.limit_max_tour.present? && total_count >= setting.limit_max_tour.to_i)
        limit_type << "virtual_tour"
      end

      if setting.do_limit_max_tour && tour.max_self_tour_users.present? && tour.max_self_tour_users.present? && !(self_tour_count < tour.max_self_tour_users.to_i)
        limit_type << "self_tour"
      end

      if setting.do_limit_max_tour && tour.max_guided_tour_users.present? && tour.max_guided_tour_users.present? && !(guided_count < tour.max_guided_tour_users.to_i)
        limit_type << "guided_tour"
      end

      return limit_type
    end

    # One day's bookings loaded once, the per-slot window counts and the
    # widget's rule computed in Ruby: Bookings::Availability asks for every
    # slot of every day it renders (the SQL variant above costs 4 COUNTs and
    # several tour lookups per slot — ~25 queries a slot, thousands a week).
    # Same window as `window_counts`: [slot − (interval + buffer − 1), slot + (interval + buffer − 1)],
    # read as a time-of-day range exactly like the SQL BETWEEN (a window that
    # wraps past midnight is empty, as the SQL range is).
    class DayCounter
      def initialize(community, date, tour:, setting:, interval:, buffer: 0)
        @tour = tour
        @setting = setting
        @step = interval + buffer.to_i - 1
        rows = community.schedual_tours.where(tour_date: date).where.not(tour_user_id: nil).pluck(:tour_time, :tour_type)
        @rows = rows.map { |time, type| [time && (time.hour * 60 + time.min), type] }
        @total_per_day = @rows.count { |_minute, type| non_virtual?(type) }
      end

      def limit_exceeded_types(time)
        slot = time.is_a?(String) ? Time.zone.parse(time) : time
        lo = minute_of(slot - @step.minutes)
        hi = minute_of(slot + @step.minutes)
        window = lo <= hi ? @rows.select { |minute, _type| minute && minute >= lo && minute <= hi } : []
        Capacity.limits_for(@tour, @setting,
                            window.count { |_minute, type| non_virtual?(type) }, @total_per_day,
                            window.count { |_minute, type| type == 'self_tour' }, window.count { |_minute, type| type == 'guided_tour' })
      end

      private

        def minute_of(time)
          time.hour * 60 + time.min
        end

        # SQL's `tour_type != 'virtual_tour'` leaves NULL types out.
        def non_virtual?(type)
          !type.nil? && type != 'virtual_tour'
        end
    end
  end
end
