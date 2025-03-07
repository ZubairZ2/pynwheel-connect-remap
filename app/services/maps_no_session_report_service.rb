class MapsNoSessionReportService < BaseService
  def initialize
    @end_date = Time.now.to_date 
    @start_date = (@end_date - 30.days)
  end

  def get_report
    csv_file = CSV.generate(headers: true) do |csv|
      csv << headers
      communities = get_communities()

      communities.each do |community|
        if no_track_sessions?(community)
          csv << formate_csv(community)
        end
      end

    end

    csv_file
  end

  private

  def headers
    %w{Company\ Name Property\ Name Property\ Email Property\ Phone}
  end

  def get_communities
    Community.all.active_client_properties.includes(:company, :track_sessions)
  end

  def no_track_sessions?(community)
    community.track_sessions
         .where(track_session_type: "maps")
         .where(start_datetime: @start_date.beginning_of_day..@end_date.end_of_day)
         .empty?
  end

  def formate_csv community
    [
      community&.company&.name,
      community.name&.strip,
      community.email&.strip,
      community.phone&.strip,
    ]
  end
end