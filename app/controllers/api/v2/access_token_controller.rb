class Api::V2::AccessTokenController < Doorkeeper::TokensController

  def revoke
    access_token = Doorkeeper::AccessToken.find_by(token: params[:token])
    access_token.destroy if access_token.present?
    message_serializer = Api::V2::Utils::Serializers::Message.new(
      type: true,
      http_status: 201,
      title: "Sign out successfully.",
      detail: []
    )
    render json: message_serializer.to_json, status: 201
  end
end
