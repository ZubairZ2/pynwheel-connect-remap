# frozen_string_literal: true

module Visitors
  # When a booking's slot was moved, from the PaperTrail versions of
  # `schedual_tours` (`has_paper_trail`; production has recorded them since
  # November 2020). An `update` version stores the row as it was before that
  # update, so the slot after it is the next version's row, or the current
  # row when no later version exists; a reschedule is a pair whose
  # `tour_date` or `tour_time` differ. `whodunnit` is the signed-in CMS user
  # (staff) — a visitor moving a booking through the widget leaves it nil.
  module Changes
    LIMIT = 400

    module_function

    # { booking_id => [{ from: {tour_date:, tour_time:}, to: {…}, at:, by: }, …] }, oldest first.
    def reschedules(bookings)
      ids = Array(bookings).map(&:id).compact.uniq
      return {} if ids.empty?

      current = Array(bookings).index_by(&:id)
      versions = PaperTrail::Version.where(item_type: 'SchedualTour', item_id: ids, event: %w[update destroy]).order(:item_id, :id).limit(LIMIT).to_a
      versions.group_by(&:item_id).each_with_object({}) do |(booking_id, rows), out|
        states = rows.map { |version| [version, Cancelled.read(version)] }.select { |_version, row| row }
        states.each_with_index do |(version, before), index|
          next unless version.event == 'update'

          after = states[index + 1]&.last || current[booking_id]
          next if after.nil?
          next if before.tour_date == after.tour_date && hhmm(before.tour_time) == hhmm(after.tour_time)

          (out[booking_id] ||= []) << {
            from: { tour_date: before.tour_date, tour_time: hhmm(before.tour_time) },
            to: { tour_date: after.tour_date, tour_time: hhmm(after.tour_time) },
            at: version.created_at,
            by: version.whodunnit.presence
          }
        end
      end
    end

    def hhmm(time)
      time&.strftime('%H:%M')
    end
  end
end
