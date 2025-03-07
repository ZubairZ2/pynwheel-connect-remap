class MapsNoSessionReportService < BaseService
  def initialize
    @end_date = Time.current.to_date
    @start_date = (@end_date - 30.days)
  end

  def get_report
    CSV.generate(headers: true) do |csv|
      csv << headers
      get_communities.find_each do |community|
        csv << format_csv(community)
      end
    end
  end

  private

  def headers
    %w[Company\ Name Property\ Name Property\ Email Property\ Phone]
  end

  def get_communities
    Community
      .active_client_properties
      .joins("LEFT JOIN track_sessions ON track_sessions.community_id = communities.id")
      .joins("LEFT JOIN companies ON companies.id = communities.company_id")
      .where(
        "track_sessions.id IS NULL OR track_sessions.start_datetime NOT BETWEEN ? AND ?",
        @start_date.beginning_of_day, @end_date.end_of_day
      )
      .select("communities.id, communities.name, communities.email, communities.phone, companies.name AS company_name")
      .order("companies.name ASC, communities.name ASC") # Sorting by company name, then community name
  end

  def format_csv(community)
    [
      community.company_name&.strip,
      community.name&.strip,
      community.email&.strip,
      community.phone&.strip,
    ]
  end
end
