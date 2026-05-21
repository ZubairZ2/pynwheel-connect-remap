require 'csv'

class PartnersPerformanceReportService < BaseService
  HEADERS = [
    'Company ID', 'Community ID', 'Company Name', 'Community Name',
    'Partner Since', 'Days Live in Period', 'Full Period?',
    'Map Interactions', 'Sessions', 'Active Sessions',
    'Hover Events', 'Click Events', 'Apply Clicks', 'Apply Click Rate (%)',
    'Activity Duration (In Minutes)'
  ].freeze

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

  def write_partner_rows(csv)
    map_partners          = MapPartner.where(partner: @partner)
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
    community_ids = MapPartner.where(partner: @partner).pluck(:community_id)
    TrackSession.where(
      track_session_type: 'maps',
      community_id: community_ids,
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

  def write_benchmark_rows(csv)
    partner_community_ids = MapPartner.where(partner: @partner).pluck(:community_id).to_set
    communities           = live_map_apply_enabled_communities
    sessions_by_community = fetch_all_sessions_for(communities.map(&:id))

    all_totals  = { interactions: 0, apply_clicks: 0 }
    excl_totals = { interactions: 0, apply_clicks: 0 }

    communities.each do |community|
      community_sessions = sessions_by_community[community.id] || []
      next if community_sessions.empty?

      interactions = community_sessions.sum(&:map_interactions)
      apply_clicks = community_sessions.sum(&:apply_click_counter)

      all_totals[:interactions]  += interactions
      all_totals[:apply_clicks]  += apply_clicks

      unless partner_community_ids.include?(community.id)
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

  def live_map_apply_enabled_communities
    live_ids = Webpage.where(hide_page: false)
                      .where.not(url: [nil, ''])
                      .pluck(:community_id)
                      .uniq

    apply_ids = Credential.where(community_id: live_ids)
                          .where(apply_now: ['true', 'separate_link'])
                          .pluck(:community_id)

    Community.where(id: apply_ids).includes(:company)
  end

  def fetch_all_sessions_for(community_ids)
    return {} if community_ids.empty?

    TrackSession.where(
      track_session_type: 'maps',
      community_id: community_ids,
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    ).group_by(&:community_id)
  end

  def filter_active_sessions(sessions)
    sessions.select do |s|
      hover  = s.amenity_marker_hovers + s.unit_marker_hovers + s.other_hovers
      clicks = sum_click_events([s])
      hover > 0 || clicks > 0
    end
  end

  def sum_hover_events(sessions)
    sessions.sum { |s| s.amenity_marker_hovers + s.unit_marker_hovers }
  end

  def sum_click_events(sessions)
    sessions.sum do |s|
      [
        s.unit_marker_clicks,         s.amenity_marker_clicks,
        s.sorting_filter_clicks,      s.bedroom_filter_clicks,
        s.pricing_filter_clicks,      s.square_feet_filter_clicks,
        s.availability_filter_clicks, s.reset_filter_clicks,
        s.view_saved_clicks,          s.schedule_tour_clicks,
        s.logo_clicks,                s.floor_number_clicks,
        s.zoom_in_clicks,             s.zoom_out_clicks,
        s.zoom_refresh_clicks,        s.clear_favorites_clicks,
        s.favorite_saved_counter,     s.virtual_tour_clicks,
        s.unit_modal_buttons_clicks,  s.open_pricing_matrix_clicks,
        s.hide_pricing_matrix_clicks
      ].sum
    end
  end

  def calculate_activity_duration(sessions)
    return 0 if sessions.empty?

    total_seconds = sessions.sum { |s| s.updated_at - s.start_datetime }
    (total_seconds / 60.0 / sessions.size).round(2)
  end
end
