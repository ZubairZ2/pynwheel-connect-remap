module Api
  module Partner
    module Maps
      class BaseController < ActionController::API

        MISSING_KEY_MESSAGE      = 'API key is missing. Please provide a valid API key in the X-API-Key header.'
        INVALID_KEY_MESSAGE      = 'Invalid API key.'
        MISSING_PROPERTY_MESSAGE = 'Property ID is missing.'
        INVALID_PROPERTY_MESSAGE = 'Invalid Property ID.'

        PARTNERS = [
          { name: "rent",          key: ENV["PARTNER_RENT_API_KEY"] },
          { name: "apartmentlist", key: ENV["PARTNER_APARTMENTLIST_API_KEY"] },
          { name: "propexo", key: ENV["PARTNER_PROPEXO_API_KEY"] }
        ]

        before_action :load_map_partners
        before_action :validate_api_key
        before_action :load_partner_name

        private

        def load_map_partners
          @registered_api_keys ||= MapPartner.pluck(:api_key).uniq
        end

        def validate_api_key
          api_key = request.headers['X-API-Key']
          if api_key.blank?
            return render json: { message: MISSING_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized
          end

          unless @registered_api_keys.include?(api_key)
            return render json: { message: INVALID_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized
          end

          @api_key = api_key
        end

        def load_partner_name
          partner = PARTNERS.find { |p| p[:key] == @api_key }
          @partner = partner&.dig(:name)
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