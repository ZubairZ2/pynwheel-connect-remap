module Api
  class NotifyEmailController < ActionController::Base
    before_action :authenticate_api_key, unless: :preflight?
    before_action :validate_params, unless: :preflight?

    def create
      return head(:ok) if preflight?

      NotifyEmailMailer.send_notification(
        to:      params[:to],
        cc:      params[:cc],
        subject: params[:subject],
        html:    params[:html]
      ).deliver_now

      render json: { status: 'ok', notification_id: "ntf_#{SecureRandom.hex(6)}" }
    rescue => e
      render json: { status: 'error', code: 'delivery_failed', message: e.message },
             status: :internal_server_error
    end

    private

    def preflight?
      request.method == 'OPTIONS'
    end

    def authenticate_api_key
      provided = request.headers['X-Api-Key']
      expected = ENV['SALES_NOTIFY_EMAIL_API_KEY']
      return if expected.present? && ActiveSupport::SecurityUtils.secure_compare(provided.to_s, expected)

      render json: { status: 'error', code: 'unauthorized', message: 'Invalid or missing API key.' },
             status: :unauthorized
    end

    def validate_params
      missing = %w[to subject html].select { |k| params[k].blank? }
      return if missing.empty?

      render json: {
        status: 'error',
        code: 'missing_params',
        message: "Missing required fields: #{missing.join(', ')}"
      }, status: :bad_request
    end
  end
end
