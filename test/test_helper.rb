ENV['RAILS_ENV'] ||= 'test'
require File.expand_path('../../config/environment', __FILE__)
require 'rails/test_help'
require 'minitest/mock'

# Named routes that begin with `test_` (ToursController#test_automate, the lock
# vendors' `test_*_connection`) become url helpers on every test class, which
# Minitest would otherwise run as tests.
class Minitest::Test
  class << self
    alias_method :runnable_methods_including_route_helpers, :runnable_methods

    def runnable_methods
      runnable_methods_including_route_helpers.reject { |name| name.end_with?('_url', '_path') }
    end
  end
end

class ActiveSupport::TestCase
  # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
  fixtures :all

  # Runs the block with CSRF verification on, as production has it.
  def with_forgery_protection
    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    yield
  ensure
    ActionController::Base.allow_forgery_protection = previous
  end
end

class ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  # config/initializers/session_store.rb scopes the session cookie to the
  # staging host outside development; requests must come from that host or
  # the cookie is never sent back and the second request is signed out.
  setup { host! 'pynwheel-staging.herokuapp.com' }
end
