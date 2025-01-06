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
    started_time = Time.now
    puts "\n Hover started \n"

    hover_events = sessions.flat_map { |session| [session.amenity_marker_hovers, session.unit_marker_hovers] }
    hover_sum = hover_events.sum

    puts "\n Hover Ended #{Time.now - started_time}\n"
    hover_sum
  end
  
  def sum_click_events(sessions)
    started_time = Time.now
    puts "\n Click started \n"

    click_events = sessions.flat_map do |session|
      [
        session.unit_marker_clicks, 
        session.amenity_marker_clicks, 
        session.sorting_filter_clicks, 
        session.bedroom_filter_clicks, 
        session.pricing_filter_clicks, 
        session.square_feet_filter_clicks, 
        session.availability_filter_clicks, 
        session.reset_filter_clicks, 
        session.view_saved_clicks, 
        session.schedule_tour_clicks, 
        session.logo_clicks, 
        session.floor_number_clicks, 
        session.zoom_in_clicks, 
        session.zoom_out_clicks, 
        session.zoom_refresh_clicks, 
        session.clear_favorites_clicks
      ]
    end

    click_sum = click_events.sum
    puts "\n Click Ended #{Time.now - started_time}\n"

    click_sum
  end
  

  def calculate_activity_duration(sessions)
    started_time = Time.now
    puts "\n Activity Duration started \n"

    total_sessions = sessions.size
    return 0 if total_sessions.zero?

    dates = sessions.pluck(:updated_at, :start_datetime)

    # Calculate total seconds for all sessions
    total_seconds = dates&.map do |date|
      (date[0] - date[1])
    end

    total_minutes = (total_seconds.sum) / 60.0

    # Calculate average duration per session
    cal_mins = (total_minutes / total_sessions).round(2)
    puts "\n Activity Duration Ended #{Time.now - started_time}\n"
    cal_mins
  end
end
