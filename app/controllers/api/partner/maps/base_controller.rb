module Api
  module Partner
    module Maps
      class BaseController < ActionController::API

        MISSING_KEY_MESSAGE      = 'API key is missing. Please provide a valid API key in the X-API-Key header.'
        INVALID_KEY_MESSAGE      = 'Invalid API key.'
        MISSING_PROPERTY_MESSAGE = 'Property ID is missing.'
        INVALID_PROPERTY_MESSAGE = 'Invalid Property ID.'

        before_action :validate_api_key

        private

        # Resolves the incoming X-API-Key to a row in the `partners` table.
        # `::Partner` is spelled with the leading colons deliberately: we are
        # inside Api::Partner, which would otherwise shadow the model.
        #
        # Sets @partner_record (the registry row) and @partner (its key), which
        # is what the map and webhook endpoints scope their queries by.
        def validate_api_key
          api_key = request.headers['X-API-Key']
          if api_key.blank?
            return render json: { message: MISSING_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized
          end

          @partner_record = ::Partner.authenticate(api_key)
          if @partner_record.nil?
            return render json: { message: INVALID_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized
          end

          @api_key = api_key
          @partner = @partner_record.key
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