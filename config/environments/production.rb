Rails.application.configure do
  config.cache_classes = true
  config.eager_load = true
  config.consider_all_requests_local       = false
  config.action_controller.perform_caching = false
  config.public_file_server.enabled = ENV['RAILS_SERVE_STATIC_FILES'].present?
  config.assets.compile = true
  config.assets.css_compressor = nil
  config.action_controller.asset_host = ENV['HOST_URL']
  config.force_ssl = true
  config.log_level = :error
  config.log_tags = [ :request_id ]
  config.action_mailer.perform_caching = false

  config.after_initialize do
    ActiveRecord::Base.logger = Rails.logger.clone
    ActiveRecord::Base.logger.level = Logger::ERROR
  end

  config.i18n.fallbacks = true
  config.active_support.deprecation = :notify
  config.log_formatter = ::Logger::Formatter.new

  if ENV["RAILS_LOG_TO_STDOUT"].present?
    logger           = ActiveSupport::Logger.new(STDOUT)
    logger.formatter = config.log_formatter
    config.logger = ActiveSupport::TaggedLogging.new(logger)
  end

  config.active_record.dump_schema_after_migration = false

  config.action_mailer.default_url_options = { host: ENV['HOST_URL'] }
  config.action_mailer.asset_host = ENV['HOST_URL']
  config.action_mailer.delivery_method = :smtp

  config.action_mailer.smtp_settings = {
       :address => "smtp.sendgrid.net",
       :port => 587,
       :user_name => ENV['SMTP_USER_NAME'],
       :password => ENV['SMTP_PASSWORD'],
       :authentication => :plain,
       :enable_starttls_auto => true,
       :domain => 'heroku.com'
  }
end

Rails.application.config.middleware.use ExceptionNotification::Rack,
  :email => {
    :email_prefix => "Pynwheel",
    :sender_address => %{"notifier" <notifier@pynwheel.com>},
    :exception_recipients => %w{ENV["PYNWHEEL_DEV_EMAIL"]}
  }