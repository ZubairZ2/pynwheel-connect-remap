Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false
  config.consider_all_requests_local = true

  if Rails.root.join('tmp/caching-dev.txt').exist?
    config.action_controller.perform_caching = true
    config.action_dispatch.rack_cache = true

    config.public_file_server.headers = {
      'Cache-Control' => "public, max-age=#{10.days.to_i}"
    }
  else
    config.action_controller.perform_caching = false
    config.cache_store = :memory_store
  end

  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.perform_caching = false
  config.active_support.deprecation = :log
  config.active_record.migration_error = :page_load
  config.assets.debug = true
  config.assets.quiet = true

  config.log_level = :debug
  if ENV['RAILS_LOG_TO_STDOUT'].present?
    logger           = ActiveSupport::Logger.new(STDOUT)
    logger.formatter = config.log_formatter # this uses Rails default
    config.logger    = ActiveSupport::TaggedLogging.new(logger)
  end
  config.active_record.verbose_query_logs = true

  config.file_watcher = ActiveSupport::EventedFileUpdateChecker
  config.action_mailer.default_url_options = { host: 'localhost', port: 3000 }
  config.action_mailer.perform_deliveries = true
  config.action_mailer.delivery_method = :letter_opener
end
