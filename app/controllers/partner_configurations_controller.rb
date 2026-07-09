class PartnerConfigurationsController < ApplicationController
  include CommunitiesHelper

  before_action :require_super_admin
  before_action :set_partners

  PER_PAGE = 25

  SORTS = {
    "property_az" => "communities.name ASC",
    "property_za" => "communities.name DESC",
    "company_az"  => "companies.name ASC, communities.name ASC",
    "company_za"  => "companies.name DESC, communities.name ASC",
    "newest"      => "communities.id DESC",
    "oldest"      => "communities.id ASC"
  }.freeze

  def index
    @partner  = params[:partner].presence
    @search   = params[:search].to_s.strip
    @sort     = SORTS.key?(params[:sort]) ? params[:sort] : "company_az"

    scope = Community.left_joins(:company)

    # Tab filter. With no partner tab and no search we only show properties that
    # already have at least one partner (keeps the default list tight and fast).
    if @partner.present? && Community::MAP_PARTNER_KEYS.include?(@partner)
      scope = scope.for_partner(@partner)
    elsif @search.blank?
      scope = scope.with_any_partner
    end

    if @search.present?
      like = "%#{Community.sanitize_sql_like(@search)}%"
      scope = scope.where(
        "communities.name ILIKE :q OR communities.code ILIKE :q OR companies.name ILIKE :q",
        q: like
      )
    end

    @total = scope.count
    @counts = tab_counts(@search)

    @communities = scope
                   .select("communities.id, communities.name, communities.code, communities.partner_map_settings, communities.company_id, companies.name AS company_name")
                   .order(Arel.sql(SORTS[@sort]))
                   .paginate(page: params[:page], per_page: PER_PAGE)
  end

  # Edit modal — set the exact partner toggle state for one property.
  def update_property
    community = Community.find(params[:id])
    Community::MAP_PARTNER_KEYS.each do |key|
      community.set_partner_map_enabled(key, params.dig(:partner_map, key).present?)
    end
    community.save!

    respond_to do |format|
      format.json { render json: { success: true, id: community.id, partners: enabled_partners(community) } }
      format.html { redirect_back fallback_location: community_partner_configurations_path(current_community), notice: "Partner configuration updated." }
    end
  end

  # Bulk update: set the selected properties' partners to exactly the chosen set.
  def bulk
    ids  = Array(params[:community_ids]).map(&:to_i).reject(&:zero?).uniq
    keys = Array(params[:partner_keys]).map(&:to_s) & Community::MAP_PARTNER_KEYS

    return respond_bulk(false, "No properties selected.") if ids.empty?

    affected = Community.bulk_set_partners(ids, keys)
    respond_bulk(true, "Updated #{affected} #{'property'.pluralize(affected)}.")
  end

  # Download a sample CSV so users know the expected upload format.
  def bulk_upload_template
    headers = %w[Company] + ["Property Name", "Address", "City", "State", "Zip"]
    samples = [
      ["JC Hart Company LLC", "East Bank", "490 Maple St", "Noblesville", "IN", "46060"],
      ["HSL Asset Management", "Encantada Tucson National", "8323 North Shannon Road", "Tucson", "AZ", "85742"],
      ["Cardinal Group", "Avoca Apartments", "1405 Avoca Ridge Drive", "Louisville", "KY", "40245"]
    ]

    csv = CSV.generate do |out|
      out << headers
      samples.each { |row| out << row }
    end

    send_data csv, filename: "partner_bulk_assign_template.csv", type: "text/csv"
  end

  # Export properties as a CSV in the same format as the upload template, so the
  # file can be edited and re-uploaded. Multi-select partners via partner_keys[]
  # (exports properties enabled for ANY of them). Pass export_all=1, or select
  # nothing, to export every client property.
  def bulk_export
    keys  = Array(params[:partner_keys]).map(&:to_s) & Community::MAP_PARTNER_KEYS
    scope = Community.active_client_properties.left_joins(:company)

    if params[:export_all].present? || keys.empty?
      slug = "all"
    else
      cond  = keys.map { |k| "partner_map_settings -> '#{k}' ->> 'enabled' = 'true'" }.join(" OR ")
      scope = scope.where(cond)
      slug  = keys.join("-")
    end

    rows = scope.order(Arel.sql("companies.name ASC NULLS LAST, communities.name ASC"))
                .pluck("companies.name", "communities.name", "communities.address",
                       "communities.city", "communities.state", "communities.zip")

    csv = CSV.generate do |out|
      out << ["Company", "Property Name", "Address", "City", "State", "Zip"]
      rows.each { |r| out << r }
    end

    send_data csv, filename: "partner_properties_#{slug}_#{Date.current.iso8601}.csv", type: "text/csv"
  end

  # Parse an uploaded CSV/Excel file and return the match preview as JSON.
  def bulk_upload_match
    file = params[:file]
    return render json: { success: false, message: "Please choose a CSV or Excel file to upload." }, status: :unprocessable_entity if file.blank?

    begin
      rows = PartnerBulkMatchService.parse_upload(file)
    rescue => e
      return render json: { success: false, message: e.message }, status: :unprocessable_entity
    end

    return render json: { success: false, message: "No property rows were found in that file. Use the template as a guide." }, status: :unprocessable_entity if rows.empty?

    results = PartnerBulkMatchService.new.match(rows)
    summary = { "exact" => 0, "partial" => 0, "unmatched" => 0 }
    results.each { |r| summary[r[:status]] += 1 }

    render json: { success: true, total: rows.size, summary: summary, results: results }
  end

  # Apply the chosen partners to the resolved (matched) community ids. Additive —
  # existing partner assignments are preserved.
  def bulk_upload_apply
    ids  = Array(params[:community_ids]).map(&:to_i).reject(&:zero?).uniq
    keys = Array(params[:partner_keys]).map(&:to_s) & Community::MAP_PARTNER_KEYS

    return respond_bulk(false, "No matched properties were selected.") if ids.empty?
    return respond_bulk(false, "Choose at least one partner to assign.") if keys.empty?

    affected = Community.bulk_add_partners(ids, keys)
    labels   = Community::MAP_PARTNERS.select { |p| keys.include?(p[:key]) }.map { |p| p[:label] }.join(", ")
    respond_bulk(true, "Assigned #{labels} to #{affected} #{'property'.pluralize(affected)}.")
  end

  private

  def require_super_admin
    unless current_user&.is_super_admin?
      respond_to do |format|
        format.json { render json: { success: false, message: "Not authorized." }, status: :forbidden }
        format.html { redirect_to root_path, alert: "You are not authorized to view that page." }
      end
    end
  end

  def set_partners
    @partners = Community::MAP_PARTNERS
  end

  # Counts per tab (All + each partner) in a single query, honoring search.
  def tab_counts(search)
    base = Community.left_joins(:company)
    if search.present?
      like = "%#{Community.sanitize_sql_like(search)}%"
      base = base.where("communities.name ILIKE :q OR communities.code ILIKE :q OR companies.name ILIKE :q", q: like)
    end

    enabled_cond = ->(k) { "partner_map_settings -> '#{k}' ->> 'enabled' = 'true'" }
    any_cond     = Community::MAP_PARTNER_KEYS.map { |k| enabled_cond.call(k) }.join(" OR ")
    all_expr     = search.present? ? "COUNT(*)" : "COUNT(*) FILTER (WHERE #{any_cond})"

    exprs = [all_expr] + Community::MAP_PARTNER_KEYS.map { |k| "COUNT(*) FILTER (WHERE #{enabled_cond.call(k)})" }
    row   = base.pluck(*exprs.map { |e| Arel.sql(e) }).first || []

    counts = { "all" => row[0].to_i }
    Community::MAP_PARTNER_KEYS.each_with_index { |k, i| counts[k] = row[i + 1].to_i }
    counts
  end

  def enabled_partners(community)
    Community::MAP_PARTNER_KEYS.select { |k| community.partner_map_enabled?(k) }
  end

  def respond_bulk(success, message)
    respond_to do |format|
      format.json { render json: { success: success, message: message }, status: (success ? :ok : :unprocessable_entity) }
      format.html do
        flash[success ? :notice : :error] = message
        redirect_back fallback_location: community_partner_configurations_path(current_community)
      end
    end
  end
end
