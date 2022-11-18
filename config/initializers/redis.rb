if Rails.env == 'production'
  uri = URI.parse(ENV["REDIS_URL"])
  Resque.redis = Redis.new(
    host:     uri.host,
    port:     uri.port,
    password: uri.password,
  )
elsif Rails.env == 'development'
  uri = URI.parse(ENV["REDIS_URL"])
  Resque.redis = Redis.new(host: uri.host)
end