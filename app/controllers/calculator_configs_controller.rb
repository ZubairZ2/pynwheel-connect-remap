class CalculatorConfigsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_community

  def show
    @calculator_config = @community.calculator_config
    @config_json       = @calculator_config&.config_json.present? ? @calculator_config.config_json.to_json : "null"
    # Provide community additional_fee as seed text for the auto-import
    @additional_fee_seed = ActionView::Base.full_sanitizer.sanitize(@community.get_additional_fees.to_s).strip
  end

  def update
    @calculator_config = @community.calculator_config || @community.build_calculator_config
    body    = request.body.read
    payload = body.present? ? JSON.parse(body) : params.to_unsafe_h

    @calculator_config.update!(config_json: payload, enabled: true)
    render json: { success: true, message: "Calculator configuration saved." }
  rescue => e
    render json: { success: false, message: e.message }, status: :unprocessable_entity
  end

  private

  def set_community
    @community = Community.find(params[:community_id])
  end
end
