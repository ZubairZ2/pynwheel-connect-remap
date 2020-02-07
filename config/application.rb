require_relative 'boot'

require 'rails/all'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module PynwheelCms
  class Application < Rails::Application
    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration should go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded.
    config.logger = Logger.new(STDOUT)
    config.logger = Log4r::Logger.new("Application Log")
    config.log_level = :error, :fatal, :unknown,  # In any environment initializer, or
    Rails.logger.level = 0
    config.active_job.queue_adapter = :sucker_punch
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*', headers: :any, methods: [:get, :post, :options]
      end
    end
  end

end
