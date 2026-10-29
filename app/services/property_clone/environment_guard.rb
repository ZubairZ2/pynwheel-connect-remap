# frozen_string_literal: true

module PropertyClone
  # Identifies the connected database and enforces the explicit confirmations
  # an execution needs. A database is treated as production-like when the
  # Rails environment is production, the database name contains "prod" (the
  # owner's local production copy included) or the host is not local.
  module EnvironmentGuard
    module_function

    LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '', nil].freeze

    def describe
      cfg = ActiveRecord::Base.connection_db_config.configuration_hash
      {
        rails_env: Rails.env.to_s,
        adapter: cfg[:adapter].to_s,
        database: cfg[:database].to_s,
        host: (cfg[:host].presence || 'localhost').to_s,
        username: cfg[:username].to_s,
        server_version: ActiveRecord::Base.connection.select_value('SHOW server_version').to_s,
        database_url_set: ENV['DATABASE_URL'].present?,
        production_like: production_like?(cfg)
      }
    end

    def production_like?(cfg = ActiveRecord::Base.connection_db_config.configuration_hash)
      return true if Rails.env.production?
      return true if cfg[:database].to_s =~ /prod/i
      return true unless LOCAL_HOSTS.include?(cfg[:host].to_s.presence)

      false
    end

    # Raises Blocked with every missing confirmation, so the operator sees
    # the whole list at once. Nothing is written before this passes.
    def require_execute!(source_id, env = ENV)
      info = describe
      missing = []
      missing << "PROPERTY_CLONE_EXECUTE=1 (got #{env['PROPERTY_CLONE_EXECUTE'].inspect})" unless env['PROPERTY_CLONE_EXECUTE'] == '1'
      missing << "CONFIRM_DATABASE=#{info[:database]} (got #{env['CONFIRM_DATABASE'].inspect})" unless env['CONFIRM_DATABASE'] == info[:database]
      missing << "CONFIRM_SOURCE=#{source_id} (got #{env['CONFIRM_SOURCE'].inspect})" unless env['CONFIRM_SOURCE'] == source_id.to_s
      if info[:production_like]
        missing << 'ALLOW_PRODUCTION=1 (the connected database is production-like)' unless env['ALLOW_PRODUCTION'] == '1'
        missing << "CONFIRM_PRODUCTION=#{info[:database]}" unless env['CONFIRM_PRODUCTION'] == info[:database]
      end
      raise Blocked, "refusing to write to #{info[:database]}@#{info[:host]} (#{info[:rails_env]}); missing: #{missing.join(', ')}" if missing.any?

      info
    end
  end
end
