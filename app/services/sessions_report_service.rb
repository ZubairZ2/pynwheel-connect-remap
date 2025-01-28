class SessionsReportService < BaseService
  def initialize(start_date, end_date)
    @start_date = start_date.to_date
    @end_date = end_date.to_date
    @months = generate_months
    @headers = generate_headers
  end

  def get_report
    CSV.generate(headers: true) do |csv|
      csv << @headers
      sorted_properties.each do |property|
        csv << format_csv(property)
      end
    end
  end

  private

  def generate_months
    (@start_date..@end_date).map { |d| "Sessions Count ( #{d.strftime("%B %Y")} )" }.uniq
  end

  def generate_headers
    ["Company Name", "Property Name", "Active/Inactive", "Subscription Start Date", "Date Inactivated", "Property Email", "Units Count"] + @months
  end

  def all_properties
    properties = Community.without_test_properties.includes(:units, :company)
    session_counts = fetch_session_counts(properties.ids)

    properties.map do |property|
      monthly_sessions = build_monthly_sessions(session_counts, property)
      build_property_data(property, monthly_sessions)
    end
  end

  def fetch_session_counts(property_ids)
    TrackSession
      .where(community_id: property_ids)
      .where(track_session_type: TOUCH_TYPES)
      .where(start_datetime: @start_date.beginning_of_day..@end_date.end_of_day)
      .group("community_id", "DATE_TRUNC('month', start_datetime)")
      .count
  end

  def build_monthly_sessions(session_counts, property)
    @months.each_with_object({}) do |month, hash|
      month_start_utc = month_start(month).to_datetime.utc
      hash[month] = session_counts[[property.id, month_start_utc]] || 0
    end
  end

  def month_start(month)
    Date.parse(month).beginning_of_month
  end

  def build_property_data(property, monthly_sessions)
    {
      company_name: property.company&.name,
      property_name: property.name,
      active_status: property.locked.present? ? (property.locked ? "Inactive" : "Active") : "Active",
      date_activated: property.date_activated,
      date_inactivated: property.date_inactivated,
      property_email: property.email,
      units_count: property.units.size,
      monthly_sessions: monthly_sessions
    }
  end

  def sorted_properties
    all_properties.sort_by { |property| [property[:company_name], property[:property_name]] }
  end

  def format_csv(property_data)
    base_data = base_property_data(property_data)
    base_data + monthly_session_data(property_data)
  end

  def base_property_data(property_data)
    [
      property_data[:company_name],
      property_data[:property_name],
      property_data[:active_status],
      property_data[:date_activated],
      property_data[:date_inactivated],
      property_data[:property_email],
      property_data[:units_count]
    ]
  end

  def monthly_session_data(property_data)
    @months.map { |month| property_data[:monthly_sessions][month] }
  end
end
