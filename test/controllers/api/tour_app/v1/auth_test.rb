require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

class Api::TourApp::V1::AuthTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  setup do
    @super = users(:super_admin)
    @manager = users(:community_manager)
    @token = api_token_for(@super)
    reset_tour_api_caches!
  end

  teardown { reset_tour_api_caches! }

  def login(email, password)
    post_json("#{BASE}/auth/login", { email: email, password: password }, {})
  end

  test 'a Super Admin signs in through the Doorkeeper password grant' do
    assert_difference -> { Doorkeeper::AccessToken.where(resource_owner_id: @super.id).count }, 1 do
      login(@super.email, 'password')
    end
    assert_response :success
    assert body['success']
    assert_equal 'bearer', body['token_type']
    assert_equal({ 'id' => @super.id, 'name' => 'Super Admin', 'email' => @super.email, 'role' => 'super_admin' }, body['user'])
    token = Doorkeeper::AccessToken.by_token(body['access_token'])
    assert_equal @super.id, token.resource_owner_id
    assert_equal 5.days.to_i, token.expires_in
    assert_equal TourApi::Text.timestamp(token.expires_at), body['expires_at']
    refute_match(/encrypted_password/, response.body)
    assert_not body['user'].key?('password')
  end

  test 'a wrong password or an unknown account is refused' do
    login(@super.email, 'nope')
    assert_response :unauthorized
    assert_equal 'invalid_credentials', body['error']['code']
    login('nobody@example.test', 'password')
    assert_response :unauthorized
    assert_equal 'invalid_credentials', body['error']['code']
  end

  test 'an account that is not a portal user is refused and its minted token revoked' do
    login(@manager.email, 'password')
    assert_response :forbidden
    assert_equal 'not_authorized_account', body['error']['code']
    refute_match(/access_token/, response.body)
    minted = Doorkeeper::AccessToken.where(resource_owner_id: @manager.id).order(:id).last
    assert minted.revoked?, 'the token minted for the refused account must be revoked'
  end

  test 'a portal user who is not a Super Admin is refused as not_super_admin' do
    @manager.update_columns(pynwheel_launch_access: true)
    login(@manager.email, 'password')
    assert_response :forbidden
    assert_equal 'not_super_admin', body['error']['code']
    assert Doorkeeper::AccessToken.where(resource_owner_id: @manager.id).order(:id).last.revoked?
  end

  test 'a Super Admin of an inactivated company is inactive' do
    gone = Company.create!(name: 'Gone Co', inactivate: true)
    @super.update_columns(company_id: gone.id)
    login(@super.email, 'password')
    assert_response :forbidden
    assert_equal 'inactive_user', body['error']['code']
  end

  test 'the login body is validated' do
    login('not-an-email', 'x')
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
    assert_equal %w[body email], body['error']['details'].first['loc']
    post_json("#{BASE}/auth/login", { email: @super.email }, {})
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
  end

  test 'a missing token answers 401 unauthorized with a challenge' do
    get "#{BASE}/properties"
    assert_response :unauthorized
    assert_equal 'unauthorized', body['error']['code']
    assert_equal 'Bearer', response.headers['WWW-Authenticate']
  end

  test 'an unknown token is invalid' do
    get "#{BASE}/properties", headers: auth('tok-made-up')
    assert_response :unauthorized
    assert_equal 'invalid_token', body['error']['code']
  end

  test 'a malformed Authorization header is unauthorized' do
    get "#{BASE}/properties", headers: { 'Authorization' => 'Basic abc' }
    assert_response :unauthorized
    assert_equal 'unauthorized', body['error']['code']
  end

  test 'an expired token' do
    get "#{BASE}/properties", headers: auth(api_token_for(@super, created_at: 6.days.ago))
    assert_response :unauthorized
    assert_equal 'token_expired', body['error']['code']
  end

  test 'a revoked token' do
    get "#{BASE}/properties", headers: auth(api_token_for(@super, revoked_at: 5.minutes.ago))
    assert_response :unauthorized
    assert_equal 'token_revoked', body['error']['code']
  end

  test 'a token without a user' do
    orphan = Doorkeeper::AccessToken.create!(resource_owner_id: nil, expires_in: 5.days.to_i, scopes: '')
    get "#{BASE}/properties", headers: auth(orphan)
    assert_response :unauthorized
    assert_equal 'invalid_token', body['error']['code']
    deleted = Doorkeeper::AccessToken.create!(resource_owner_id: 424_242, expires_in: 5.days.to_i, scopes: '')
    get "#{BASE}/properties", headers: auth(deleted)
    assert_response :unauthorized
    assert_equal 'invalid_token', body['error']['code']
  end

  test 'a non Super Admin token is forbidden' do
    get "#{BASE}/properties", headers: auth(api_token_for(@manager))
    assert_response :forbidden
    assert_equal 'not_super_admin', body['error']['code']
  end

  test 'me and logout' do
    get "#{BASE}/auth/me", headers: auth
    assert_response :success
    assert_equal 'super_admin', body['user']['role']
    assert_equal TourApi::Text.timestamp(@token.expires_at), body['expires_at']
    post "#{BASE}/auth/logout", headers: auth
    assert_response :success
    assert_equal({ 'success' => true, 'revoked' => true }, body)
    assert @token.reload.revoked?
    get "#{BASE}/auth/me", headers: auth
    assert_response :unauthorized
    assert_equal 'token_revoked', body['error']['code']
  end

  test 'health needs no token' do
    get "#{BASE}/health"
    assert_response :success
    assert_equal true, body['database']
    assert_equal 'ok', body['status']
  end

  test 'anything else under the prefix answers the API envelope' do
    get "#{BASE}/nothing"
    assert_response :not_found
    assert_equal({ 'success' => false, 'error' => { 'code' => 'not_found', 'message' => 'Not Found' } }, body)
  end
end
