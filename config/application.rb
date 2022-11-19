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

    # config.active_jobs.running_on[:sucker_punch] = [ MyJob, YourJob, HerJob ]
    # config.active_jobs.running_on[:resque] = [RealPageDataUpdateWorker, YardirentcafeDataUpdateWorker, EntrataDataUpdateWorker, YardiDataUpdateWorker ]

    # config.active_job.queue_adapter = :sucker_punch
    config.active_job.queue_adapter = :sidekiq

    config.action_dispatch.rack_cache = true
    config.cache_store = :redis_store, ENV["REDIS_URL"], { expires_in: 120.minutes }

    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*', headers: :any, methods: [:get, :post, :options , :patch, :put , :delete]
      end
    end
  end

end
