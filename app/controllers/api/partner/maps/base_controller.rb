module Api
  module Partner
    module Maps
      class BaseController < ActionController::API

        MISSING_KEY_MESSAGE      = 'API key is missing. Please provide a valid API key in the X-API-Key header.'
        INVALID_KEY_MESSAGE      = 'Invalid API key.'
        MISSING_PROPERTY_MESSAGE = 'Property ID is missing.'
        INVALID_PROPERTY_MESSAGE = 'Invalid Property ID.'

        before_action :validate_api_key
        before_action :load_partner_name

        private

        # The api_key -> partner mapping is sourced from ENV via
        # Community::MAP_PARTNERS — no database lookup and no cached key registry.
        def validate_api_key
          api_key = request.headers['X-API-Key']
          if api_key.blank?
            return render json: { message: MISSING_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized
          end

          unless Community.valid_partner_api_key?(api_key)
            return render json: { message: INVALID_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized
          end

          @api_key = api_key
        end

        def load_partner_name
          @partner = Community.partner_for_api_key(@api_key)
        end

        # Validates a short-lived session token issued by the `authorized` action.
        # Sets @session_api_key and @session_property_id on success.
        def validate_session_token
          raw = request.headers['Authorization']
          token = raw&.sub(/\ABearer\s+/i, '')

          if token.blank?
            render json: { message: 'Session token missing.', status: 'failed', code: 401 }, status: :unauthorized
            return
          end

          begin
            payload = Rails.application.message_verifier(:pyn_sdk_v1).verify(token)

            if payload[:exp].to_i < Time.now.to_i
              render json: { message: 'Session expired. Please reinitialize.', status: 'failed', code: 401 }, status: :unauthorized
              return
            end

            @session_api_key  = payload[:api_key]
            @session_property_id = payload[:property_id]
          rescue ActiveSupport::MessageVerifier::InvalidSignature
            render json: { message: 'Invalid session token.', status: 'failed', code: 401 }, status: :unauthorized
          end
        end

      end
    end
  end
end