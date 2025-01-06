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

    start_time = Time.now
    puts "Generating report..."
    
    csv = CSV.generate(headers: true) do |csv|
      csv << HEADERS
      @communities.find_each(batch_size: 100) do |community|
        csv << format_csv_row(community)
      end
    end

    puts "Report generated in #{Time.now - start_time} seconds"
    csv
  end

  private

  def empty_report
    CSV.generate(headers: true) { |csv| csv << HEADERS }
  end

  def format_csv_row(community)
    start_time = Time.now
    interactions = track_sessions(community)
    active_sessions = filter_active_sessions(interactions)

    puts "\nSumming hover events for community #{community.id}..."
    hovers = sum_hover_events(interactions)

    puts "\nSumming click events for community #{community.id}..."
    clicks = sum_click_events(interactions)

    puts "\nCalculating activity duration for community #{community.id}..."
    duration = calculate_activity_duration(active_sessions)

    puts "Row for community #{community.id} processed in #{Time.now - start_time} seconds"

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
    start_time = Time.now
    community_ids = MapPartner.where(partner: @partner).pluck(:community_id)
    communities = Community.joins(:company)
                           .includes(:track_sessions)
                           .where(id: community_ids)
                           .order('companies.name, communities.name')

    puts "Fetched partner properties in #{Time.now - start_time} seconds"
    communities
  end

  def track_sessions(community)
    start_time = Time.now
    sessions = community.track_sessions.where(
      track_session_type: "maps",
      partner: @partner,
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    )

    puts "Fetched track sessions for community #{community.id} in #{Time.now - start_time} seconds"
    sessions
  end

  def filter_active_sessions(sessions)
    start_time = Time.now
    active_sessions = sessions.where(
      Arel.sql("EXTRACT(EPOCH FROM (COALESCE(end_datetime, updated_at) - start_datetime)) > 10")
    )

    puts "Filtered active sessions in #{Time.now - start_time} seconds"
    active_sessions
  end

  def sum_hover_events(sessions)
    start_time = Time.now
    hover_sum = sessions.sum("amenity_marker_hovers + unit_marker_hovers")
    puts "Summed hover events in #{Time.now - start_time} seconds"
    hover_sum
  end

  def sum_click_events(sessions)
    start_time = Time.now
    click_sum = sessions.sum(
      "unit_marker_clicks + amenity_marker_clicks + sorting_filter_clicks + bedroom_filter_clicks + pricing_filter_clicks + 
      square_feet_filter_clicks + availability_filter_clicks + reset_filter_clicks + view_saved_clicks + 
      schedule_tour_clicks + logo_clicks + floor_number_clicks + zoom_in_clicks + zoom_out_clicks + zoom_refresh_clicks + 
      clear_favorites_clicks"
    )
    puts "Summed click events in #{Time.now - start_time} seconds"
    click_sum
  end

  def calculate_activity_duration(sessions)
    start_time = Time.now
    total_sessions = sessions.size
    return 0 if total_sessions.zero?
  
    # Perform the division within SQL, not Ruby
    total_minutes = sessions.sum(
      Arel.sql("EXTRACT(EPOCH FROM (COALESCE(updated_at, start_datetime) - start_datetime))") 
    ) / 60.0 # Divide here in SQL
    duration = (total_minutes / total_sessions).round(2)
  
    puts "Calculated activity duration in #{Time.now - start_time} seconds"
    duration
  end
  
end
