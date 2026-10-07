# Be sure to restart your server when you modify this file.

# Configure sensitive parameters which will be filtered from the log file.
# `token` also masks the Doorkeeper access / refresh tokens in ActiveRecord's
# SQL bind logging (debug level, development and staging): the Tour App API
# looks tokens up on every request and must never log them (October 7, 2026).
Rails.application.config.filter_parameters += [:password, :token]

# ActiveRecord copies `filter_parameters` into `filter_attributes` when it
# loads; an earlier initializer of this app loads it before this file runs, so
# the attribute filter is set here as well (runs at once when it is already loaded).
ActiveSupport.on_load(:active_record) do
  self.filter_attributes += [:password, :token]
end
