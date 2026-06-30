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

  CLICK_SUM_SQL   = CLICK_COLUMNS.map { |c| "COALESCE(#{c}, 0)" }.join(' + ').freeze
  HOVER_SUM_SQL   = 'COALESCE(amenity_marker_hovers, 0) + COALESCE(unit_marker_hovers, 0)'.freeze
  ACTIVE_COND_SQL = "(COALESCE(amenity_marker_hovers,0) + COALESCE(unit_marker_hovers,0) + " \
                    "COALESCE(other_hovers,0) > 0 OR (#{CLICK_SUM_SQL}) > 0)".freeze

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

  def partner_community_ids
    @partner_community_ids ||= MapPartner.where(partner: @partner).pluck(:community_id)
  end

  def write_partner_rows(csv)
    map_partners = MapPartner.where(partner: @partner)
                             .includes(community: :company)
                             .joins(community: :company)
                             .order('companies.name, communities.name')

    stats = fetch_community_stats(partner_community_ids)

    map_partners.each do |mp|
      community = mp.community
      next unless community

      partner_since = mp.created_at.to_date
      days_live     = [(@end_date - [partner_since, @start_date].max).to_i + 1, 0].max
      full_period   = partner_since <= @start_date

      csv << build_partner_row(community, stats[community.id] || {}, partner_since, days_live, full_period)
    end
  end

  # One SQL query per community batch — all metrics aggregated in the DB, no session objects in Ruby
  def fetch_community_stats(community_ids)
    return {} if community_ids.empty?

    rows = TrackSession.where(
      track_session_type: 'maps',
      partner: @partner,
      community_id: community_ids,
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    ).group(:community_id).pluck(
      :community_id,
      Arel.sql('SUM(map_interactions)'),
      Arel.sql('SUM(apply_click_counter)'),
      Arel.sql('COUNT(*)'),
      Arel.sql("SUM(#{HOVER_SUM_SQL})"),
      Arel.sql("SUM(#{CLICK_SUM_SQL})"),
      Arel.sql("COUNT(*) FILTER (WHERE #{ACTIVE_COND_SQL})"),
      Arel.sql("COALESCE(AVG(GREATEST(EXTRACT(EPOCH FROM (updated_at - start_datetime)), 0) / 60.0) " \
               "FILTER (WHERE #{ACTIVE_COND_SQL}), 0)")
    )

    rows.each_with_object({}) do |(cid, interactions, apply_clicks, sessions, hovers, clicks, active, duration), h|
      h[cid] = {
        interactions:      interactions.to_i,
        apply_clicks:      apply_clicks.to_i,
        sessions:          sessions.to_i,
        hover_events:      hovers.to_i,
        click_events:      clicks.to_i,
        active_sessions:   active.to_i,
        activity_duration: duration.to_f.round(2)
      }
    end
  end

  def build_partner_row(community, stats, partner_since, days_live, full_period)
    interactions = stats[:interactions] || 0
    apply_clicks = stats[:apply_clicks] || 0
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
      stats[:sessions]          || 0,
      stats[:active_sessions]   || 0,
      stats[:hover_events]      || 0,
      stats[:click_events]      || 0,
      apply_clicks,
      "#{apply_rate}%",
      stats[:activity_duration] || 0
    ]
  end

  def write_benchmark_rows(csv)
    partner_ids_set = partner_community_ids.to_set

    aggregated = TrackSession.where(
      track_session_type: 'maps',
      community_id: live_map_apply_enabled_community_ids,
      start_datetime: @start_date.beginning_of_day..@end_date.end_of_day
    ).group(:community_id)
     .pluck(:community_id, Arel.sql('SUM(map_interactions)'), Arel.sql('SUM(apply_click_counter)'))

    all_totals  = { interactions: 0, apply_clicks: 0 }
    excl_totals = { interactions: 0, apply_clicks: 0 }

    aggregated.each do |cid, interactions, apply_clicks|
      all_totals[:interactions] += interactions.to_i
      all_totals[:apply_clicks] += apply_clicks.to_i

      unless partner_ids_set.include?(cid)
        excl_totals[:interactions] += interactions.to_i
        excl_totals[:apply_clicks] += apply_clicks.to_i
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

  def live_map_apply_enabled_community_ids
    live_ids = Webpage.where(hide_page: false)
                      .where.not(url: [nil, ''])
                      .pluck(:community_id)
                      .uniq

    Credential.where(community_id: live_ids)
              .where(apply_now: ['true', 'separate_link'])
              .pluck(:community_id)
  end
end
