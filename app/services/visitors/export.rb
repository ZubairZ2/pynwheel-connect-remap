# frozen_string_literal: true

require 'csv'

module Visitors
  # The Visitors list as CSV, with the filters applied: one line per visitor
  # with the columns the list shows. No access code, selfie or ID photo.
  module Export
    HEADERS = ['Date', 'Time', 'Last name', 'First name', 'Email', 'Phone', 'Tour type', 'Status', 'ID check', 'Source', 'Flags'].freeze

    module_function

    def csv(community, filters = {})
      query = Query.new(community, filters.merge(page: 1, per: Query::PER_MAX))
      status = filters[:status].to_s
      rows = query.filtered_rows
      rows = rows.select { |row| row.status == status } if Query::STATUSES.include?(status) && status != 'all'
      zone = ActiveSupport::TimeZone[Status.tz(community)] || ActiveSupport::TimeZone['UTC']
      CSV.generate(headers: true) do |csv|
        csv << HEADERS
        rows.each do |row|
          at = row.when_at.in_time_zone(zone)
          csv << [
            at.strftime('%Y-%m-%d'), at.strftime('%H:%M'), row.visitor.last_name, row.visitor.first_name, row.visitor.email, row.visitor.phone_number,
            Status::TYPE_LABEL[row.type], row.status, row.id_check[:label], row.source, row.flags.map { |f| f[:label] }.join('; ')
          ]
        end
      end
    end
  end
end
