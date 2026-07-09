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
