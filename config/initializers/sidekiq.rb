Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV["REDIS_TLS_URL"],
    ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE }  # Use VERIFY_PEER for production
  }
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV["REDIS_TLS_URL"],
    ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE }  # Use VERIFY_PEER for production
  }
end
