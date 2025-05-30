Sidekiq.configure_server do |config|
  if Rails.env.development?
    config.logger = ActiveSupport::Logger.new(STDOUT)
    config.logger.level = Logger::DEBUG
    config.logger.formatter = Rails.application.config.log_formatter
  end

  config.redis = {
    url: ENV["REDIS_URL"],
    ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE }  # Use VERIFY_PEER for production
  }
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV["REDIS_URL"],
    ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE }  # Use VERIFY_PEER for production
  }
end

Rails.application.config.after_initialize do
  if Rails.env.development?
    ActiveRecord.verbose_query_logs = true
  end
end
