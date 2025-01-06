class PartnerAnalyticsReportService < BaseService
  HEADERS = %w[
    Company\ ID
    Community\ ID
    Company\ Name
    Community\ Name
    Map\ Interactions
    Active\ Sessions
    Hover\ Events
    Click\ Events
    Activity\ Duration
  ].freeze

  def initialize(start_date, end_date, partner)
    @start_date = start_date.to_date
    @end_date = end_date.to_date
    @partner = partner
    @communities = fetch_partner_properties
  end

  def get_report
    return empty_report if @communities.empty?

    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      @communities.each do |community|
        csv << format_csv_row(community)
      end
    end
  end

  private

  def empty_report
    CSV.generate(headers: true) { |csv| csv << HEADERS }
  end

  def format_csv_row(community)
    interactions = track_sessions(community)
    active_sessions = filter_active_sessions(interactions)
    puts "\n Hovers start\n"
    hovers = sum_hover_events(interactions)
    puts "\n Hovers end\n"
    puts "\n Clicks start\n"
    clicks = sum_click_events(interactions)
    puts "\n Clicks end\n"
    puts "\n Duration start\n"
    duration = calculate_activity_duration(active_sessions)
    puts "\n Duration end\n"

    [
      community&.company&.id,
      community.id,
      community&.company&.name,
      community.name,
      interactions.size,
      active_sessions.size,
      hovers,
      clicks,
      duration
    ]
  end

  def fetch_partner_properties
    community_ids = MapPartner.where(partner: @partner).pluck(:community_id)
    Community.where(id: community_ids)
             .includes(:company)
             .includes(:track_sessions)
             .order('companies.name, communities.name')
  end

  def track_sessions(community)
    community&.track_sessions.where(
      track_session_type: "maps",
      partner: @partner
    ).where(
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    )
  end

  def filter_active_sessions(sessions)
    sessions.where(
      Arel.sql("EXTRACT(EPOCH FROM (COALESCE(end_datetime, updated_at) - start_datetime)) > 10")
    )
  end

  def sum_hover_events(sessions)
    sessions.sum(:amenity_marker_hovers) +
      sessions.sum(:unit_marker_hovers)
  end

  def sum_click_events(sessions)
    sessions.sum(:unit_marker_clicks) +
      sessions.sum(:amenity_marker_clicks) +
      sessions.sum(:sorting_filter_clicks) +
      sessions.sum(:bedroom_filter_clicks) +
      sessions.sum(:pricing_filter_clicks) +
      sessions.sum(:square_feet_filter_clicks) +
      sessions.sum(:availability_filter_clicks) +
      sessions.sum(:reset_filter_clicks) +
      sessions.sum(:view_saved_clicks) +
      sessions.sum(:schedule_tour_clicks) +
      sessions.sum(:logo_clicks) +
      sessions.sum(:floor_number_clicks) +
      sessions.sum(:zoom_in_clicks) +
      sessions.sum(:zoom_out_clicks) +
      sessions.sum(:zoom_refresh_clicks) +
      sessions.sum(:clear_favorites_clicks)
  end

  def calculate_activity_duration(sessions)
    total_sessions = sessions.size
    return 0 if total_sessions.zero?
  
    # Calculate total minutes for all sessions
    total_minutes = sessions.sum(
      Arel.sql("EXTRACT(EPOCH FROM (COALESCE(updated_at, start_datetime) - start_datetime))")
    ) / 60.0 # Convert seconds to minutes
  
    # Calculate average duration per session
    (total_minutes / total_sessions).round(2)
  end
  
end