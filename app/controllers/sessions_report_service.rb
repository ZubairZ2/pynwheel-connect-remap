class SessionsReportService < BaseService
  HEADERS = %w{Company\ Name Property\ Name Annual\ Sessions\ Count}.freeze

  def initialize()
    @end_date =  Date.today
    @start_date = Date.new(2024, 1, 1)
  end

  def get_report
    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      companies_with_properties.each do |company, properties|
        properties.each do |property|
          csv << format_csv(company, property)
        end
      end
    end
  end

  private

  def companies_with_properties
    Company.where.not(id: [44, 783]).joins(communities: :track_sessions)
           .where(track_sessions: { track_session_type: TOUCH_TYPES })
           .where('track_sessions.start_datetime > ? AND track_sessions.start_datetime < ?', @start_date.beginning_of_day, @end_date.end_of_day)
           .group('companies.id', 'communities.id')
           .order('companies.name', 'communities.name')
           .pluck('companies.name', 'communities.name', 'COUNT(track_sessions.id)')
           .group_by { |company_name, _, _| company_name }
  end

  def format_csv(company, property_data)
    [
      company,
      property_data[1],
      property_data[2]
    ]
  end
end
