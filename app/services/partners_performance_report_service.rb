require 'csv'

class PartnersPerformanceReportService < BaseService
  HEADERS = [
    'Company ID', 'Community ID', 'Company Name', 'Community Name',
    'Partner Since', 'Days Live in Period', 'Full Period?',
    'Map Interactions', 'Sessions', 'Active Sessions',
    'Hover Events', 'Click Events', 'Apply Clicks', 'Apply Click Rate (%)',
    'Activity Duration (In Minutes)'
  ].freeze

  CLICK_COLUMNS = %w[
    unit_marker_clicks amenity_marker_clicks sorting_filter_clicks
    bedroom_filter_clicks pricing_filter_clicks square_feet_filter_clicks
    availability_filter_clicks reset_filter_clicks view_saved_clicks
    schedule_tour_clicks logo_clicks floor_number_clicks zoom_in_clicks
    zoom_out_clicks zoom_refresh_clicks clear_favorites_clicks
    favorite_saved_counter virtual_tour_clicks unit_modal_buttons_clicks
    open_pricing_matrix_clicks hide_pricing_matrix_clicks
  ].freeze

  SESSION_SELECT = (%w[
    id community_id map_interactions apply_click_counter
    amenity_marker_hovers unit_marker_hovers other_hovers
    updated_at start_datetime
  ] + CLICK_COLUMNS).join(', ').freeze

  def initialize(start_date, end_date, partner)
    @start_date = start_date.to_date
    @end_date   = end_date.to_date
    @partner    = partner
  end

  def get_report
    CSV.generate(headers: true) do |csv|
      csv << HEADERS
      write_partner_rows(csv)
      csv << []
      csv << []
      write_benchmark_rows(csv)
    end
  end

  private

  # Memoized so MapPartner is only queried once across write_partner_rows + write_benchmark_rows
  def partner_community_ids
    @partner_community_ids ||= MapPartner.where(partner: @partner).pluck(:community_id)
  end

  def write_partner_rows(csv)
    map_partners = MapPartner.where(partner: @partner)
                             .includes(community: :company)
                             .joins(community: :company)
                             .order('companies.name, communities.name')

    sessions_by_community = fetch_partner_sessions

    map_partners.each do |mp|
      community = mp.community
      next unless community

      sessions      = sessions_by_community[community.id] || []
      partner_since = mp.created_at.to_date
      days_live     = [(@end_date - [partner_since, @start_date].max).to_i + 1, 0].max
      full_period   = partner_since <= @start_date

      csv << build_partner_row(community, sessions, partner_since, days_live, full_period)
    end
  end

  def fetch_partner_sessions
    TrackSession.select(SESSION_SELECT)
                .where(
                  track_session_type: 'maps',
                  community_id: partner_community_ids,
                  start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
                ).group_by(&:community_id)
  end

  def build_partner_row(community, sessions, partner_since, days_live, full_period)
    active       = filter_active_sessions(sessions)
    interactions = sessions.sum(&:map_interactions)
    apply_clicks = sessions.sum(&:apply_click_counter)
    apply_rate   = interactions > 0 ? (apply_clicks.to_f / interactions * 100).round(2) : 0.0

    [
      community.company&.id,
      community.id,
      community.company&.name,
      community.name,
      partner_since,
      days_live,
      full_period ? 'Yes' : 'No',
      interactions,
      sessions.size,
      active.size,
      sum_hover_events(sessions),
      sum_click_events(sessions),
      apply_clicks,
      "#{apply_rate}%",
      calculate_activity_duration(active)
    ]
  end

  # Benchmark rows use pure SQL aggregation — no session records loaded into Ruby
  def write_benchmark_rows(csv)
    partner_ids_set = partner_community_ids.to_set

    aggregated = TrackSession.where(
      track_session_type: 'maps',
      community_id: live_map_apply_enabled_community_ids,
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    ).group(:community_id)
     .pluck(:community_id, 'SUM(map_interactions)', 'SUM(apply_click_counter)')

    all_totals  = { interactions: 0, apply_clicks: 0 }
    excl_totals = { interactions: 0, apply_clicks: 0 }

    aggregated.each do |cid, interactions, apply_clicks|
      interactions = interactions.to_i
      apply_clicks = apply_clicks.to_i

      all_totals[:interactions] += interactions
      all_totals[:apply_clicks] += apply_clicks

      unless partner_ids_set.include?(cid)
        excl_totals[:interactions] += interactions
        excl_totals[:apply_clicks] += apply_clicks
      end
    end

    csv << ["=== APPLY CLICK RATE BENCHMARKS (#{@start_date} – #{@end_date}) ==="]
    csv << ['', 'Map Interactions', 'Apply Clicks', 'Apply Click Rate (%)']
    csv << ['All live-map + apply-enabled properties',
            all_totals[:interactions], all_totals[:apply_clicks], "#{rate_pct(all_totals)}%"]
    csv << ["Excluding #{@partner.capitalize}-tied properties",
            excl_totals[:interactions], excl_totals[:apply_clicks], "#{rate_pct(excl_totals)}%"]
  end

  def rate_pct(totals)
    return 0.0 if totals[:interactions].zero?

    (totals[:apply_clicks].to_f / totals[:interactions] * 100).round(2)
  end

  # Returns only IDs — no need for full Community objects for the benchmark query
  def live_map_apply_enabled_community_ids
    live_ids = Webpage.where(hide_page: false)
                      .where.not(url: [nil, ''])
                      .pluck(:community_id)
                      .uniq

    Credential.where(community_id: live_ids)
              .where(apply_now: ['true', 'separate_link'])
              .pluck(:community_id)
  end

  def filter_active_sessions(sessions)
    sessions.select do |s|
      hover = s.amenity_marker_hovers + s.unit_marker_hovers + s.other_hovers
      hover > 0 || CLICK_COLUMNS.any? { |col| s.public_send(col) > 0 }
    end
  end

  def sum_hover_events(sessions)
    sessions.sum { |s| s.amenity_marker_hovers + s.unit_marker_hovers }
  end

  def sum_click_events(sessions)
    sessions.sum { |s| CLICK_COLUMNS.sum { |col| s.public_send(col) } }
  end

  def calculate_activity_duration(sessions)
    return 0 if sessions.empty?

    total_seconds = sessions.sum { |s| s.updated_at - s.start_datetime }
    (total_seconds / 60.0 / sessions.size).round(2)
  end
end
