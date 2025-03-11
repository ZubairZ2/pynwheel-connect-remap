class MapsNoSessionReportService < BaseService
  def initialize
    @end_date = Time.current.to_date
    @start_date = (@end_date - 30.days)
  end

  def get_report
    CSV.generate(headers: true) do |csv|
      csv << headers
      communities = get_communities
      communities.each do |community|
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
      .joins("LEFT JOIN (
        SELECT DISTINCT community_id 
        FROM track_sessions 
        WHERE start_datetime BETWEEN '#{@start_date.beginning_of_day}' AND '#{@end_date.end_of_day}'
      ) AS recent_sessions ON recent_sessions.community_id = communities.id")
      .joins("LEFT JOIN companies ON companies.id = communities.company_id")
      .where("recent_sessions.community_id IS NULL")
      .order("companies.name ASC NULLS LAST, communities.name ASC NULLS LAST")
      .pluck("companies.name", "communities.name", "communities.email", "communities.phone") 
  end  

  def format_csv(community)
    [
      community[0],
      community[1],
      community[2],
      community[3],
    ]
  end
end