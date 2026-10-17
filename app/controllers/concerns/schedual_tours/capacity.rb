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

    def window_counts(community, date, time)
      step = stepping(community)
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

    # The widget's rule, verbatim.
    def check_limit(tour_type, total_count, total_count_per_day, self_tour_count, guided_count, community)
      limit_type = []

      if (community.community_tour.tour_setting.do_limit_max_tour && community.community_tour.tour_setting.limit_max_tour.present? && total_count >= community.community_tour.tour_setting.limit_max_tour.to_i)
        limit_type << "virtual_tour"
      end

      if community.community_tour.tour_setting.do_limit_max_tour && community.community_tour.max_self_tour_users.present? && community.community_tour.max_self_tour_users.present? && !(self_tour_count < community.community_tour.max_self_tour_users.to_i)
        limit_type << "self_tour"
      end

      if community.community_tour.tour_setting.do_limit_max_tour && community.community_tour.max_guided_tour_users.present? && community.community_tour.max_guided_tour_users.present? && !(guided_count < community.community_tour.max_guided_tour_users.to_i)
        limit_type << "guided_tour"
      end

      return limit_type
    end
  end
end
