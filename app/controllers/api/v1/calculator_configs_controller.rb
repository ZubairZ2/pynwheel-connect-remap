class Api::V1::CalculatorConfigsController < ApplicationController
  skip_before_action :authenticate_user!, raise: false
  protect_from_forgery with: :null_session

  before_action :set_community

  # GET /api/v1/communities/:id/calculator_config
  # Returns the full SDK-ready JSON payload for a community.
  def show
    config = @community.calculator_config

    if config&.enabled?
      render json: config.as_sdk_json
    else
      render json: { error: "Calculator not configured for this property." }, status: :not_found
    end
  end

  private

  def set_community
    @community = Community.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Property not found." }, status: :not_found
  end
end
