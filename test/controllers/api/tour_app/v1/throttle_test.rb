require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

# The Rack::Attack limits on the Tour App's sign-ins, bookings and locks
# (config/initializers/rack_attack.rb, October 23, 2026). The middleware is
# off for the rest of the suite; here it runs with its own memory store.
class Api::TourApp::V1::ThrottleTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper
  include TourApiJobsStub

  setup do
    fake_jobs!
    @previous_store = Rack::Attack.cache.store
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
    Rack::Attack.enabled = true
  end

  teardown do
    Rack::Attack.enabled = false
    Rack::Attack.cache.store = @previous_store
    restore_jobs!
  end

  test 'the staff sign-in is limited per address and per account' do
    6.times { |i| post_json("#{BASE}/auth/login", { email: 'someone@example.test', password: "nope#{i}" }, {}) }
    assert_response :too_many_requests
    assert_equal 'rate_limit_exceeded', body['error']['code']
    assert response.headers['Retry-After'].present?
    post_json("#{BASE}/auth/login", { email: 'other@example.test', password: 'nope' }, {})
    assert_response :unauthorized, 'another account from the same address is still inside the per-address limit'
  end

  test 'a phone can ask for one code a minute and a wrong code is limited per phone' do
    post_json("#{BASE}/visitor/otp", { phone: '+13035550150', country_code: 'US' }, {})
    assert_response :accepted
    post_json("#{BASE}/visitor/otp", { phone: '+13035550150', country_code: 'US' }, {})
    assert_response :too_many_requests
    post_json("#{BASE}/visitor/otp", { phone: '+13035550151', country_code: 'US' }, {})
    assert_response :accepted, 'another phone is not affected'
    11.times { post_json("#{BASE}/visitor/otp/verify", { phone: '+13035550150', code: '000000' }, {}) }
    assert_response :too_many_requests
  end

  test 'bookings and lock issuance are limited per address' do
    token = api_token_for(users(:super_admin))
    community = communities(:tour_property)
    11.times { post_json("#{BASE}/properties/#{community.id}/bookings", { tour_type: 'self_tour' }, auth(token)) }
    assert_response :too_many_requests
    21.times { post_json("#{BASE}/properties/#{community.id}/locks/pin", { stop_id: 'unit:1' }, auth(token)) }
    assert_response :too_many_requests
  end
end
