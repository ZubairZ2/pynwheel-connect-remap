require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

# Smart locks on the stops list and the igloohome door code
# (POST /properties/:id/locks/pin), the Capacitor app's port of the legacy
# Pynwheel Tour app's Igloo integration. The vendor is never reached: every
# HTTParty.post the igloohome services make is answered by `vendor`.
class Api::TourApp::V1::LocksTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  # What HTTParty gives the services back (`code`, `[]`, `dig`, `parsed_response`).
  FakeResponse = Struct.new(:code, :parsed_response) do
    def [](key)
      parsed_response.is_a?(Hash) ? parsed_response[key] : nil
    end

    def dig(*keys)
      parsed_response.is_a?(Hash) ? parsed_response.dig(*keys) : nil
    end

    def success?
      (200..299).cover?(code)
    end

    def body
      parsed_response.to_json
    end
  end

  setup do
    build_tour_app_fixtures!
    @token = api_token_for(users(:super_admin))
    @community.update_columns(enable_locks: true, multiple_locks_provider: ['Igloohome'], time_zone: 'UTC')
    @account = Igloohome.create!(community_id: @community.id, username: 'Username', password: 'Password', version: 'igloohome', home_name: 'pynwheel home', client_id: 'client-id', client_secret: 'client-secret')
    @unit101.update_columns(lock_provider: 'Igloohome')
    @lock = IgloohomeLock.create!(igloohome: @account, device_id: 'SK3E14001756', device_name: '101', stop: @unit101)
    @calls = []
    reset_tour_api_caches!
  end

  teardown { reset_tour_api_caches! }

  # Runs the block with the igloohome / Iglooworks HTTP answered locally: the
  # OAuth token request gets a token, the PIN request gets `pin_response`.
  def with_vendor(pin_response, &block)
    stub = lambda do |url, **options|
      @calls << [url, options]
      if url.include?('/oauth2/token')
        FakeResponse.new(200, { 'access_token' => 'vendor-token' })
      else
        pin_response
      end
    end
    HTTParty.stub(:post, stub, &block)
  end

  def stop_lock(stop_id)
    get "#{@base}/stops", headers: auth
    assert_response :success, response.body
    all_stops(body).find { |s| s['id'] == stop_id }['lock']
  end

  def request_pin(stop_id, headers = auth)
    post_json("#{@base}/locks/pin", { stop_id: stop_id }, headers)
    body
  end

  test 'the stops list says which stop carries which lock' do
    assert_equal({ 'provider' => 'Igloohome', 'mode' => 'igloohome', 'method' => 'pin', 'device_id' => 'SK3E14001756', 'supported' => true }, stop_lock(@u101))
    assert_nil stop_lock(@u301), 'no lock provider on 301'
    assert_nil stop_lock(@gym_key)
  end

  test 'a lock on the door counts for the unit, as the legacy mapping has it' do
    door = doors(:unit_door)
    @lock.update_columns(stop_type: 'Door', stop_id: door.id)
    door.update_columns(lock_provider: 'Igloohome')
    @unit101.update_columns(lock_provider: '')
    reset_tour_api_caches!
    assert_equal 'SK3E14001756', stop_lock(@u101)['device_id']
    with_vendor(FakeResponse.new(200, { 'pin' => '123456789', 'pinId' => 'abc' })) do
      data = request_pin(@u101)
      assert_response :success, response.body
      assert_equal '101 (door 1)', data['access_name'], "the door's own name, as IgloohomeLockService#get_device_pin_code names the access"
    end
  end

  test 'a door code for an igloohome API lock: the legacy hourly algoPIN request' do
    with_vendor(FakeResponse.new(200, { 'pin' => '221673337', 'pinId' => '6ad124' })) do
      travel_to Time.utc(2026, 10, 16, 14, 25) do
        data = request_pin(@u101)
        assert_response :success, response.body
        assert_equal %w[success stop_id provider mode device_id access_name pin valid_from valid_until], data.keys
        assert_equal({ 'stop_id' => @u101, 'provider' => 'Igloohome', 'mode' => 'igloohome', 'device_id' => 'SK3E14001756', 'access_name' => '101', 'pin' => '221673337' }, data.slice('stop_id', 'provider', 'mode', 'device_id', 'access_name', 'pin'))
        assert_equal '2026-10-16T14:00:00+00:00', data['valid_from'], 'from the top of the current hour in the property time zone'
        assert_equal '2026-10-16T17:00:00+00:00', data['valid_until'], 'three hours, as the legacy app asked'
      end
    end
    token_call, pin_call = @calls
    assert_match %r{/oauth2/token\z}, token_call[0], 'client credentials first: the account had no token'
    assert_equal 'client_credentials', token_call[1][:body]['grant_type']
    assert_equal "#{ENV['IGLOOHOME_API_V2_BASE_URL']}/devices/SK3E14001756/algopin/hourly", pin_call[0]
    assert_equal({ 'variance' => 1, 'startDate' => '2026-10-16T14:00:00+00:00', 'endDate' => '2026-10-16T17:00:00+00:00', 'accessName' => '101' }, JSON.parse(pin_call[1][:body]))
    assert_equal 'Bearer vendor-token', pin_call[1][:headers]['Authorization']
    assert_equal 'vendor-token', @account.reload.access_token, 'the token is kept on the account for the next code, as the CMS does'
  end

  test 'a stale token on a client-credentials account is renewed once and the code request retried' do
    # The legacy service's corner: a stored token sets is_authorized_with_pynwheel, after which it never renews.
    @account.update_columns(access_token: 'stale', access_token_expiry: 2.days.from_now, is_authorized_with_pynwheel: true)
    answers = [FakeResponse.new(401, { 'message' => 'Unauthorized' }), FakeResponse.new(200, { 'pin' => '555666777' })]
    stub = lambda do |url, **options|
      @calls << [url, options]
      url.include?('/oauth2/token') ? FakeResponse.new(200, { 'access_token' => 'renewed' }) : answers.shift
    end
    HTTParty.stub(:post, stub) do
      data = request_pin(@u101)
      assert_response :success, response.body
      assert_equal '555666777', data['pin']
    end
    assert_equal 3, @calls.size, 'pin (401), token, pin (200)'
    assert_equal 'Bearer stale', @calls[0][1][:headers]['Authorization']
    assert_match %r{/oauth2/token\z}, @calls[1][0]
    assert_equal 'Bearer renewed', @calls[2][1][:headers]['Authorization']
    assert_equal 'renewed', @account.reload.access_token

    # Without client credentials there is nothing to renew with: the refusal stands.
    @account.update_columns(client_id: nil, client_secret: nil, access_token: 'stale')
    @calls.clear
    with_vendor(FakeResponse.new(401, { 'message' => 'Unauthorized' })) do
      assert_equal 'lock_unavailable', request_pin(@u101)['error']['code']
    end
    assert_equal 1, @calls.size
  end

  test 'an Iglooworks lock goes through the department endpoint with the sanitised access name' do
    @account.update_columns(version: 'iglooworks', iglooworks_api_key: 'works-key', iglooworks_department_id: 'dept-1')
    @unit101.update_columns(marketing_name: '1-101')
    reset_tour_api_caches!
    assert_equal 'iglooworks', stop_lock(@u101)['mode']
    with_vendor(FakeResponse.new(200, { 'pin' => '987654321' })) do
      data = request_pin(@u101)
      assert_response :success, response.body
      assert_equal ['987654321', 'iglooworks', '1101'], [data['pin'], data['mode'], data['access_name']]
    end
    url, options = @calls.last
    assert_equal "#{ENV['IGLOOHOME_IGLOOWORKS_API_BASE_URL']}/departments/dept-1/locks/SK3E14001756/pin/hourly", url
    assert_equal 'works-key', options[:headers]['X-IGLOOWORKS-APIKEY']
    assert_equal '1101', JSON.parse(options[:body])['accessName']
  end

  test 'a vendor refusal is a 502 lock_unavailable, never a trace or a fake code' do
    with_vendor(FakeResponse.new(401, { 'message' => 'Unauthorized' })) do
      data = request_pin(@u101)
      assert_response 502, response.body
      assert_equal 'lock_unavailable', data['error']['code']
    end
    with_vendor(FakeResponse.new(200, { 'pinId' => 'no pin field' })) do
      assert_equal 'lock_unavailable', request_pin(@u101)['error']['code']
    end
  end

  test 'a vendor outage is a 502 lock_unavailable too' do
    raising = ->(_url, **_options) { raise SocketError, 'getaddrinfo: nodename nor servname provided' }
    HTTParty.stub(:post, raising) do
      data = request_pin(@u101)
      assert_response 502, response.body
      assert_equal 'lock_unavailable', data['error']['code']
      assert_no_match(/getaddrinfo/, response.body)
    end
  end

  test 'a stop without a lock, an unknown stop, and a hidden stop' do
    assert_equal 'no_lock', request_pin(@u301)['error']['code']
    assert_response 422
    assert_equal 'invalid_stop', request_pin('unit:999999')['error']['code']
    assert_equal({ 'invalid_stops' => ['unit:999999'] }, body['error']['details'])
    assert_equal 'invalid_stop', request_pin(@u102)['error']['code'], 'display_stop false is not on the tour'
    assert_equal 'validation_error', request_pin('x')['error']['code']
  end

  def request_key(stop_id, headers = auth)
    post_json("#{@base}/locks/bluetooth-key", { stop_id: stop_id }, headers)
    body
  end

  test 'igloohome v1 is a Bluetooth lock: supported, but not with a door code' do
    @account.update_columns(version: 'v1')
    reset_tour_api_caches!
    lock = stop_lock(@u101)
    assert_equal({ 'provider' => 'Igloohome', 'mode' => 'v1', 'method' => 'bluetooth', 'device_id' => 'SK3E14001756', 'supported' => true }, lock)
    assert_equal 'lock_unsupported', request_pin(@u101)['error']['code']
    assert_response 422
    assert_equal 0, @calls.size
  end

  test 'a Bluetooth guest key for a v1 lock: the legacy partner-API requests, 90 minutes, the backup PIN' do
    @account.update_columns(version: 'v1')
    reset_tour_api_caches!
    stub = lambda do |url, **options|
      @calls << [url, options]
      # The partner API answers the key and the PIN at the top level of the body.
      if url.end_with?('/ekeys')
        FakeResponse.new(200, { 'bluetoothGuestKey' => 'guest-key-abc', 'keyId' => 'key-1' })
      else
        FakeResponse.new(200, { 'pin' => '4455667' })
      end
    end
    HTTParty.stub(:post, stub) do
      travel_to Time.utc(2026, 10, 16, 14, 25) do
        data = request_key(@u101)
        assert_response :success, response.body
        assert_equal %w[success stop_id provider mode device_id lock_name bluetooth_key key_id guest_pin valid_from valid_until], data.keys
        assert_equal({ 'stop_id' => @u101, 'provider' => 'Igloohome', 'mode' => 'v1', 'device_id' => 'SK3E14001756', 'lock_name' => 'SK3E14001756', 'bluetooth_key' => 'guest-key-abc', 'key_id' => 'key-1', 'guest_pin' => '4455667' }, data.except('success', 'valid_from', 'valid_until'))
        assert_equal '2026-10-16T14:25:00+00:00', data['valid_from']
        assert_equal '2026-10-16T15:55:00+00:00', data['valid_until'], '90 minutes, as IgloohomeService asks the partner API'
      end
    end
    ekeys, pin = @calls
    assert_equal "#{ENV['IGLOOHOME_API_BASE_URL']}/v2/locks/SK3E14001756/ekeys", ekeys[0]
    assert_equal ENV['IGLOOHOME_API_KEY'], ekeys[1][:headers]['X-IGLOOCOMPANY-APIKEY']
    ekeys_body = JSON.parse(ekeys[1][:body])
    assert_includes ekeys_body['permissions'], 'UNLOCK'
    assert_equal 23, ekeys_body['permissions'].size, 'the permission set the legacy service grants'
    assert_equal "#{ENV['IGLOOHOME_API_BASE_URL']}/v2/locks/SK3E14001756/pin/hourly", pin[0]
    assert_equal 3, JSON.parse(pin[1][:body])['variance']
    assert_no_match(/guest-key-abc/, File.read(Rails.root.join('log', 'test.log')).lines.last(40).join) rescue nil
  end

  test 'a Bluetooth key is refused for door-code locks, and a partner-API refusal is a 502' do
    assert_equal 'lock_unsupported', request_key(@u101)['error']['code'], 'the account is in igloohome (PIN) mode'
    assert_response 422
    @account.update_columns(version: 'v1')
    reset_tour_api_caches!
    with_vendor(FakeResponse.new(404, { 'message' => 'Lock not found' })) do
      data = request_key(@u101)
      assert_response 502, response.body
      assert_equal 'lock_unavailable', data['error']['code']
    end
    assert_equal 'no_lock', request_key(@u301)['error']['code']
    assert_equal 'invalid_stop', request_key('unit:999999')['error']['code']
    post_json("#{@base}/locks/bluetooth-key", { stop_id: @u101 }, JSON_HEADERS)
    assert_response :unauthorized
  end

  test 'other vendors are present but unsupported' do
    @unit101.update_columns(lock_provider: 'Latch')
    reset_tour_api_caches!
    assert_equal({ 'provider' => 'Latch', 'mode' => nil, 'method' => 'bluetooth', 'device_id' => nil, 'supported' => false }, stop_lock(@u101))
    assert_equal 'lock_unsupported', request_pin(@u101)['error']['code']
    assert_equal 'lock_unsupported', request_key(@u101)['error']['code']
  end

  test 'an igloohome stop with no device mapped is unsupported' do
    @lock.delete
    reset_tour_api_caches!
    assert_equal false, stop_lock(@u101)['supported']
    assert_nil stop_lock(@u101)['device_id']
    assert_equal 'lock_unsupported', request_pin(@u101)['error']['code']
  end

  test 'locks turned off for the property' do
    @community.update_columns(enable_locks: false)
    reset_tour_api_caches!
    assert_equal false, stop_lock(@u101)['supported']
    assert_equal 'locks_disabled', request_pin(@u101)['error']['code']
    assert_response 422
  end

  test 'the gates of every property endpoint apply' do
    post_json("#{@base}/locks/pin", { stop_id: @u101 }, JSON_HEADERS)
    assert_response :unauthorized
    assert_equal 'unauthorized', body['error']['code']
    post_json("#{BASE}/properties/#{communities(:no_tour_property).id}/locks/pin", { stop_id: @u101 })
    assert_response 422
    assert_equal 'tour_disabled', body['error']['code']
    post_json("#{BASE}/properties/999999/locks/pin", { stop_id: @u101 })
    assert_response :not_found
  end
end
