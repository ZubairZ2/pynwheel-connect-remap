class PricingCalculatorsController < ActionController::Base
  layout "pricing_calculator"

  after_action :allow_iframe

  before_action :set_community
  before_action :check_calculator_enabled
  before_action :set_unit_context      # sets @unit + @floorplan from params[:unit_id]
  before_action :set_calculator_config # can now safely access @unit / @floorplan

  # GET /communities/:community_id/pricing_calculators
  def show; end

  # GET /communities/:community_id/pricing_calculators/unit?unit_id=:id
  def unit
    render :show
  end

  private

  def set_community
    @community = Community.find(params[:community_id])
  end

  def check_calculator_enabled
    unless @community.enable_pynwheel_pricing_calculator?
      @calculator_disabled = true
      render :disabled, status: :forbidden and return
    end
  end

  def set_unit_context
    return unless params[:unit_id].present?
    @unit           = @community.units.find_by(id: params[:unit_id])
    @unit_not_found = @unit.nil?
    @floorplan      = @unit ? Floorplan.find_by(provider_floorplan_id: @unit.floorplan_id, community_id: @community.id) : nil
  end

  def set_calculator_config
    @calculator_config  = @community.calculator_config
    @config_json        = @calculator_config&.config_json.present? ? @calculator_config.config_json.to_json : "null"

    # Additional fee seed: respects display_additional_fee flag + unit/community priority
    raw_fee              = @community.get_additional_fees(@unit).to_s
    @additional_fee_seed = ActionView::Base.full_sanitizer.sanitize(raw_fee).strip

    # Lease term pricing matrix — [{pricing_month: "12 Month", pricing_rent: "$1500"}, ...]
    @lease_terms_matrix = @unit ? @unit.get_lease_term_pricing_matrix : []
    @default_lease_term = @unit&.lease_term || 12

    # Rent values
    @base_rent = (@unit&.effective_rent || @unit&.market_rent).to_f
    @min_rent  = @unit&.min_effective_rent.to_f
    @max_rent  = @unit&.max_effective_rent.to_f

    # Security deposit from floorplan
    @deposit = @floorplan&.deposit.to_f

    # Move-in / available date
    @available_date = @unit&.available_date

    # Apply Now URL
    @apply_now_url      = compute_apply_now_url
    @apply_now_provider = @community.data_provider
    @apply_now_unit_pid = @unit&.provider_unit_id
  end

  def allow_iframe
    response.headers.delete("X-Frame-Options")
    response.headers["Content-Security-Policy"] = "frame-ancestors *"
  end

  def compute_apply_now_url
    return nil unless @unit
    credential = @community.credential
    return nil unless credential&.apply_now.to_s.in?(%w[true separate_link])

    if credential.apply_now.to_s == 'separate_link'
      credential.separate_link
    elsif @community.data_provider == 'realpagesvc'
      # JS will append MoveInDate + UnitId query params
      "/communities/#{@community.id}/webpages/apply_now"
    else
      @unit.get_availability_url(@floorplan)
    end
  end
end
