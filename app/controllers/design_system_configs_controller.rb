class DesignSystemConfigsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_community

  def show
    @design_system_config = @community.design_system_config || @community.build_design_system_config
    render json: { config: @design_system_config.merged_config }
  end

  def update
    @design_system_config = @community.design_system_config || @community.build_design_system_config
    body    = request.body.read
    payload = body.present? ? JSON.parse(body) : params.to_unsafe_h.except("controller", "action", "community_id")

    merged = @design_system_config.config_json.deep_merge(payload)
    @design_system_config.update!(config_json: merged)

    render json: { success: true, config: @design_system_config.merged_config }
  rescue => e
    render json: { success: false, message: e.message }, status: :unprocessable_entity
  end

  private

  def set_community
    @community = Community.find(params[:community_id])
  end
end
