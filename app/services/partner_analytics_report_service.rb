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
        sessions = track_sessions(community)
        csv << format_csv_row(community, sessions)
      end
    end
  end

  private

  def empty_report
    CSV.generate(headers: true) { |csv| csv << HEADERS }
  end

  def format_csv_row(community, sessions)
    sessions ||= []  # Ensure sessions is always an array (empty if nil)

    active_sessions = filter_active_sessions(sessions)
    interactions = sessions.size

    [
      community.company&.id,
      community.id,
      community.company&.name,
      community.name,
      interactions,
      active_sessions.size,
      sum_hover_events(sessions),
      sum_click_events(sessions),
      calculate_activity_duration(active_sessions)
    ]
  end

  def fetch_partner_properties
    community_ids = MapPartner.where(partner: @partner).pluck(:community_id)
    Community.where(id: community_ids)
             .includes(:company)
             .order('companies.name, communities.name')
  end

  def track_sessions(community)
    TrackSession.where(
      track_session_type: "maps",
      community_id: community.id,
      partner: @partner
    ).where(
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    )
  end

  def filter_active_sessions(sessions)
    return [] if sessions.nil? || sessions.empty?  # Handle nil or empty sessions

    sessions.select do |session|
      session.updated_at - session.start_datetime > 10 # Consider sessions that last more than 10 seconds
    end
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
    total_minutes = sessions.sum do |session|
      (session.updated_at - session.start_datetime) / 60.0  # Convert seconds to minutes
    end

    # Calculate average duration per session
    (total_minutes / total_sessions).round(2)
  end
end
