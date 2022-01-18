class Api::V2::ApiApplicationController < ActionController::Base
  before_action :check_user_auth

  def check_user_auth
    if request.headers["Authorization"].present?
      check_token_expiry
    else
      unauthorized_user_alert
    end
  end
  private

  def check_token_expiry
    if current_pynwheel_user.nil?
      error_serializer = Api::V2::Utils::Serializers::Message.new(
        type: false,
        http_status: 401,
        title: "Invalid or expired auth token",
        detail: []
      )
      render json: error_serializer.to_json, status: 401
    end
  end

  def unauthorized_user_alert
    error_serializer = Api::V2::Utils::Serializers::Message.new(
      type: false,
      http_status: 401,
      title: "Unauthorized, token not found.",
      detail: []
    )
    render json: error_serializer.to_json, status: 401
  end

  def current_pynwheel_user
    @current_user ||= User.find_by(id: doorkeeper_token[:resource_owner_id]) if verified_token
  end

  def verified_token
    doorkeeper_token.present? && doorkeeper_token.revoked_at.nil?
  end
end
