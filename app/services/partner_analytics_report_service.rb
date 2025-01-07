class PartnerAnalyticsReportService < BaseService
  HEADERS = %w[
    Company\ ID
    Community\ ID
    Company\ Name
    Community\ Name
    Map\ Interactions
    Sessions
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
      sessions = fetch_sessions
      @communities.each do |community|
        community_sessions = sessions[community.id] || []
        csv << format_csv_row(community, community_sessions)
      end
    end
  end

  private

  def empty_report
    CSV.generate(headers: true) { |csv| csv << HEADERS }
  end

  def format_csv_row(community, sessions)
    active_sessions = filter_active_sessions(sessions)
    [
      community.company&.id,
      community.id,
      community.company&.name,
      community.name,
      map_interactions(sessions),
      sessions.size,
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

  def fetch_sessions
    sessions = TrackSession.where(
      track_session_type: "maps",
      partner: @partner,
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    )
    sessions_grouped_by_community = sessions.group_by(&:community_id)
    sessions_grouped_by_community
  end

  def filter_active_sessions(sessions)
    sessions.select do |session|
      hover_events = [
        session.amenity_marker_hovers,
        session.unit_marker_hovers,
        session.other_hovers
    ].sum
      click_events = [
        session.unit_marker_clicks, session.amenity_marker_clicks,
        session.sorting_filter_clicks, session.bedroom_filter_clicks,
        session.pricing_filter_clicks, session.square_feet_filter_clicks,
        session.availability_filter_clicks, session.reset_filter_clicks,
        session.view_saved_clicks, session.schedule_tour_clicks,
        session.logo_clicks, session.floor_number_clicks,
        session.zoom_in_clicks, session.zoom_out_clicks,
        session.zoom_refresh_clicks, session.clear_favorites_clicks,
        session.other_clicks
      ].sum
  
      # Consider the session active if it has any hover or click events
      (hover_events > 0 || click_events > 0)
    end
  end  

  def sum_hover_events(sessions)
    # Calculate hover events dynamically without modifying TrackSession
    sessions.sum do |session|
      session.amenity_marker_hovers + session.unit_marker_hovers + session.other_hovers
    end
  end

  def sum_click_events(sessions)
    # Calculate click events dynamically without modifying TrackSession
    sessions.sum do |session|
      [
        session.unit_marker_clicks, session.amenity_marker_clicks,
        session.sorting_filter_clicks, session.bedroom_filter_clicks,
        session.pricing_filter_clicks, session.square_feet_filter_clicks,
        session.availability_filter_clicks, session.reset_filter_clicks,
        session.view_saved_clicks, session.schedule_tour_clicks,
        session.logo_clicks, session.floor_number_clicks,
        session.zoom_in_clicks, session.zoom_out_clicks,
        session.zoom_refresh_clicks, session.clear_favorites_clicks,
        session.other_clicks
      ].sum
    end
  end

  def map_interactions(sessions)
    sessions.sum(&:map_interactions)
  end  

  def calculate_activity_duration(sessions)
    total_sessions = sessions.size
    return 0 if total_sessions.zero?

    total_seconds = sessions.sum { |session| session.updated_at - session.start_datetime }
    total_minutes = total_seconds / 60.0

    (total_minutes / total_sessions).round(2)
  end
end
