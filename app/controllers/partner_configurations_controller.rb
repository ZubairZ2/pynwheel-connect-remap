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

    scope = Community.active_client_properties.left_joins(:company)

    # Tab filter. With no partner tab and no search we only show properties that
    # already have at least one partner (keeps the default list tight and fast).
    if @partner.present? && partner_keys.include?(@partner)
      @partner_record = @partners.find { |p| p.key == @partner }
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
    before    = enabled_partners(community)

    partner_keys.each do |key|
      community.set_partner_map_enabled(key, params.dig(:partner_map, key).present?)
    end
    community.save!

    after = enabled_partners(community)
    record_association_changes(community, before, after)

    respond_to do |format|
      format.json { render json: { success: true, id: community.id, partners: after } }
      format.html { redirect_back fallback_location: community_partner_configurations_path(current_community), notice: "Partner configuration updated." }
    end
  end

  # Bulk update: set the selected properties' partners to exactly the chosen set.
  def bulk
    ids  = Array(params[:community_ids]).map(&:to_i).reject(&:zero?).uniq
    keys = permitted_partner_keys(params[:partner_keys])

    return respond_bulk(false, "No properties selected.") if ids.empty?

    affected = Community.bulk_set_partners(ids, keys)
    log_association_event(keys, ids, "bulk_set")
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
    keys  = permitted_partner_keys(params[:partner_keys])
    scope = Community.active_client_properties.left_joins(:company)

    if params[:export_all].present? || keys.empty?
      slug = "all"
    else
      scope = scope.where(keys.map { |k| Community.partner_enabled_sql(k) }.join(" OR "))
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
    keys = permitted_partner_keys(params[:partner_keys])

    return respond_bulk(false, "No matched properties were selected.") if ids.empty?
    return respond_bulk(false, "Choose at least one partner to assign.") if keys.empty?

    affected = Community.bulk_add_partners(ids, keys)
    log_association_event(keys, ids, "bulk_upload")

    labels = @partners.select { |p| keys.include?(p.key) }.map(&:label).join(", ")
    respond_bulk(true, "Assigned #{labels} to #{affected} #{'property'.pluralize(affected)}.")
  end

  # ---------------------------------------------------------------------------
  # Partner registry management
  #
  # Adding a partner is a row in `partners`, not a deploy — the tabs, modals and
  # filters all read the registry.
  # ---------------------------------------------------------------------------

  def create_partner
    partner = Partner.new(label: params[:label].to_s.strip, key: params[:key].presence || params[:label])
    partner.position = (Partner.maximum(:position) || -1) + 1

    if partner.save
      partner.log_event!("created", actor: current_user)
      render json: { success: true, partner: partner_json(partner), message: "#{partner.label} added." }
    else
      render json: { success: false, message: partner.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  # Issue a partner's first key, or rotate an existing one. Either way the
  # plaintext is returned only as a one-time link that can be emailed on.
  def rotate_key
    partner = find_partner!
    token   = partner.issue_api_key!(actor: current_user)

    render json: {
      success:    true,
      partner:    partner_json(partner),
      token:      token,
      reveal_url: partner_key_reveal_url(token),
      message:    "A new API key was generated for #{partner.label}. The one-time link below is the only time it can be read."
    }
  end

  # Email the one-time link to the partner.
  #
  # The token is the whole secret, so it is never taken on trust: it has to
  # still be pending in the reveal store, which rules out a link that was
  # already opened, has expired, or was superseded by a later rotation. Sending
  # is synchronous on purpose — the admin is watching the modal and needs to
  # know now whether to fall back to copying the link by hand.
  def email_key
    partner   = find_partner!
    recipient = params[:email].to_s.strip
    token     = params[:token].to_s

    unless recipient.match?(URI::MailTo::EMAIL_REGEXP)
      return render json: { success: false, message: "Enter a valid email address." },
                    status: :unprocessable_entity
    end

    unless PartnerApiKey.reveal_pending?(token)
      return render json: {
        success: false,
        message: "That link has already been opened or has expired. Rotate the key to issue a new one."
      }, status: :unprocessable_entity
    end

    begin
      PartnerKeyMailer.api_key_link(
        recipient:        recipient,
        partner_label:    partner.label,
        reveal_url:       partner_key_reveal_url(token),
        expires_in_hours: (PartnerApiKey::REVEAL_TTL / 1.hour).to_i
      ).deliver_now
    rescue => e
      Rails.logger.error("[PartnerConfigurations] key email to #{recipient} failed: #{e.class}: #{e.message}")
      return render json: {
        success: false,
        message: "The email could not be sent. Copy the link above and send it manually."
      }, status: :bad_gateway
    end

    # Recorded so the trail shows where a key was sent, not just that it was issued.
    partner.log_event!("key_emailed", actor: current_user, metadata: { "recipient" => recipient })

    render json: { success: true, message: "Sent to #{recipient}. The link still opens only once." }
  end

  def revoke_key
    partner = find_partner!
    partner.revoke_api_key!(actor: current_user)

    render json: {
      success: true,
      partner: partner_json(partner),
      message: "#{partner.label}'s API key was revoked. Their requests will be rejected until a new key is issued."
    }
  end

  private

  # Pynwheel admins only — this screen exposes every client's property list and
  # the partner API keys, so it is gated for the whole controller rather than
  # per action. `format.any` matters: without it an unusual format (say
  # bulk_export.csv) would fall through respond_to and raise instead of being
  # denied, which makes the denial depend on the request format.
  def require_super_admin
    return if current_user&.is_super_admin?

    respond_to do |format|
      format.json { render json: { success: false, message: "Not authorized." }, status: :forbidden }
      format.html { redirect_to root_path, alert: "You are not authorized to view that page." }
      format.any  { head :forbidden }
    end
  end

  # The registry, loaded once per request — the tabs, the modals and the count
  # query all read it.
  def set_partners
    @partners = Partner.registry
  end

  def partner_keys
    @partner_keys ||= @partners.map(&:key)
  end

  def permitted_partner_keys(raw)
    Array(raw).map(&:to_s) & partner_keys
  end

  def find_partner!
    @partners.find { |p| p.key == params[:partner_key].to_s } ||
      (raise ActiveRecord::RecordNotFound, "Unknown partner")
  end

  def partner_json(partner)
    {
      key:        partner.key,
      label:      partner.label,
      has_key:    partner.api_key?,
      masked_key: partner.masked_api_key,
      issued_at:  partner.key_issued_at&.to_fs(:long),
      rotated_at: partner.key_rotated_at&.to_fs(:long),
      revoked_at: partner.key_revoked_at&.to_fs(:long)
    }
  end

  # Counts per tab (All + each partner) in a single query, honoring search.
  def tab_counts(search)
    base = Community.active_client_properties.left_joins(:company)
    if search.present?
      like = "%#{Community.sanitize_sql_like(search)}%"
      base = base.where("communities.name ILIKE :q OR communities.code ILIKE :q OR companies.name ILIKE :q", q: like)
    end

    return { "all" => base.count } if partner_keys.empty?

    any_cond = partner_keys.map { |k| Community.partner_enabled_sql(k) }.join(" OR ")
    all_expr = search.present? ? "COUNT(*)" : "COUNT(*) FILTER (WHERE #{any_cond})"

    exprs = [all_expr] + partner_keys.map { |k| "COUNT(*) FILTER (WHERE #{Community.partner_enabled_sql(k)})" }
    row   = base.pluck(*exprs.map { |e| Arel.sql(e) }).first || []

    counts = { "all" => row[0].to_i }
    partner_keys.each_with_index { |k, i| counts[k] = row[i + 1].to_i }
    counts
  end

  def enabled_partners(community)
    partner_keys.select { |k| community.partner_map_enabled?(k) }
  end

  # --- Audit trail ----------------------------------------------------------

  # One event per partner whose association with this property changed, so the
  # trail answers "who put this property on Jonah, and when".
  def record_association_changes(community, before, after)
    (Array(before) | Array(after)).each do |key|
      was, now = before.include?(key), after.include?(key)
      next if was == now

      partner = @partners.find { |p| p.key == key }
      next if partner.nil?

      partner.log_event!(
        "properties_updated",
        actor: current_user,
        metadata: { "action" => (now ? "associated" : "disassociated"),
                    "community_ids" => [community.id], "source" => "edit_property" }
      )
    end
  end

  # Bulk writes are a single set-based UPDATE, so the trail records one event
  # per partner carrying the affected ids rather than a row per property.
  def log_association_event(keys, community_ids, source)
    @partners.each do |partner|
      next unless keys.include?(partner.key)

      partner.log_event!(
        "properties_updated",
        actor: current_user,
        metadata: { "action" => "associated", "community_ids" => community_ids, "source" => source }
      )
    end
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
