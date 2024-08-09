class SessionsReportService < BaseService
  HEADERS = %w{Company\ Name Property\ Name Sessions\ Count}.freeze

  def initialize
    @end_date = Date.today
    @start_date = Date.new(2024, 1, 1)
  end

  def get_report
    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      sorted_properties.each do |property|
        csv << format_csv(property)
      end
    end
  end

  private

  def all_properties
    # Fetch all properties with the touchscreen app
    properties = Community.active_touch_properties
                          .includes(:company)

    # Fetch session counts for the given timestamp
    session_counts = TrackSession
                       .where(community_id: properties.pluck(:id))
                       .where(track_session_type: TOUCH_TYPES)
                       .where('start_datetime >= ? AND start_datetime <= ?', @start_date.beginning_of_day, @end_date.end_of_day)
                       .group(:community_id)
                       .count

    # Merge properties with session counts
    properties.map do |property|
      sessions_count = session_counts.fetch(property.id, 0)
      {
        company_name: property.company&.name,
        property_name: property.name,
        sessions_count: sessions_count
      }
    end
  end

  def sorted_properties
    all_properties.sort_by { |property| [property[:company_name], property[:property_name]] }
  end

  def format_csv(property_data)
    [
      property_data[:company_name],
      property_data[:property_name],
      property_data[:sessions_count]
    ]
  end
end