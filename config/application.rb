require_relative 'boot'

require 'rails/all'
require './lib/lograge/formatters/json_custom.rb'
require './lib/log/impression.rb'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module PynwheelCms
  class Application < Rails::Application
    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.

    # config.active_jobs.running_on[:sucker_punch] = [ MyJob, YourJob, HerJob ]
    # config.active_jobs.running_on[:resque] = [RealPageDataUpdateWorker, YardirentcafeDataUpdateWorker, EntrataDataUpdateWorker, YardiDataUpdateWorker ]

    # config.active_job.queue_adapter = :sucker_punch
    config.eager_load_paths += %W{#{config.root}/lib}
    config.active_job.queue_adapter = :sidekiq

    config.action_dispatch.rack_cache = true
    # config.cache_store = :redis_store, ENV["REDIS_URL"], { expires_in: 120.minutes }
    config.cache_store = :redis_store, ENV["REDIS_TLS_URL"], {
      expires_in: 120.minutes,
      ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE }
    }


    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*', headers: :any, methods: [:get, :post, :options , :patch, :put , :delete]
      end
    end
    # ========TAIM LOGGING WITH LOGRAGGE========

    #-----------------------------------------------------------
    config.log_level = :info
    config.lograge.enabled = true
    config.log_tags = [:request_id]
    config.log_formatter  = ::Logger::Formatter.new
    config.lograge.formattter = Lograge::Formatters::JsonCustom.new

    # Need and ENV Variable here to assure the logging is stdout or not
    # shift_age = after shift_size of file the logs will be splitted and divided into shift_age file size
    # After 20 mb
    logger = ActiveSupport::Logger.new(STDOUT, shift_age = 3, shift_size = 20.megabytes, shift_period_suffix:  '%Y%m%d-%H:%M:%S')
    # logger = ActiveSupport::Logger.new(STDOUT)
    logger.formatter = proc do |severity, datetime, progname, msg|
      "[#{severity}] [RAILS] #{msg} \n"
    end
    config.logger = ActiveSupport::TaggedLogging.new(logger)
    #-----------------------------------------------------------

  end

end
