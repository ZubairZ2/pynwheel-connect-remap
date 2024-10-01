require 'uri'
require 'redis'

if Rails.env.production?
  uri = URI.parse(ENV["REDIS_URL"])

  Resque.redis = Redis.new(
    host:     uri.host,
    port:     uri.port,
    password: uri.password,
    ssl:      uri.scheme == 'rediss', # Enable SSL if using rediss://
    ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE } # Skip SSL verification (optional)
  )
  
elsif Rails.env.development?
  uri = URI.parse(ENV["REDIS_URL"])

  Resque.redis = Redis.new(
    host: uri.host,
    port: uri.port,
    password: uri.password
  )
end