require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

class Api::TourApp::V1::SecurityTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  setup do
    build_tour_app_fixtures!
    @token = api_token_for(users(:super_admin))
    @other = communities(:sitemap_property)
  end

  teardown { reset_tour_api_caches! }

  test 'a stop that is not on this property\'s list is rejected' do
    post_json("#{@base}/tour-route", { stop_ids: [@u102] })
    assert_response :unprocessable_entity
    assert_equal 'invalid_stop', body['error']['code']
    other_unit = Unit.create!(community: @other, marketing_name: 'S1', provider_unit_id: 's1', x_plot: 60, y_plot: 60, visible: true)
    TourStop.create!(tour: tours(:sitemap_tour), stop_type: 'unit', stop_id: other_unit.id, name: 'S1', display_stop: true)
    reset_tour_api_caches!
    post_json("#{@base}/tour-route", { stop_ids: ["unit:#{other_unit.id}"] })
    assert_equal 'invalid_stop', body['error']['code']
    post_json("#{@base}/route", { from_stop_id: @u101, to_stop_id: "unit:#{other_unit.id}" })
    assert_equal 'unknown_endpoint', body['error']['code'], "another property's node is not on this map"
  end

  test 'routing against a property without the tour is refused' do
    post_json("#{BASE}/properties/#{communities(:no_tour_property).id}/tour-route", { stop_ids: [@u101] })
    assert_response :unprocessable_entity
    assert_equal 'tour_disabled', body['error']['code']
  end

  test 'a non Super Admin reaches no property endpoint' do
    manager = auth(api_token_for(users(:community_manager)))
    ['', '/stops', '/map', '/graph', "/map/levels/#{@level_a}"].each do |path|
      get "#{@base}#{path}", headers: manager
      assert_response :forbidden, path
      assert_equal 'not_super_admin', body['error']['code'], path
    end
    post_json("#{@base}/route", { from_stop_id: @u101, to_stop_id: @u301 }, manager)
    assert_response :forbidden
    get "#{BASE}/properties", headers: manager
    assert_response :forbidden
  end

  test 'property ids are validated before anything is looked up' do
    get "#{BASE}/properties/0", headers: auth
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
    get "#{BASE}/properties/abc", headers: auth
    assert_response :unprocessable_entity
    assert_equal %w[path property_id], body['error']['details'].first['loc']
    get "#{BASE}/properties/424242/stops", headers: auth
    assert_response :not_found
    assert_equal 'not_found', body['error']['code']
  end

  test 'errors never leak internals' do
    TourApi::Stops.stub(:list, ->(*) { raise 'SELECT secret FROM users' }) do
      get "#{@base}/stops", headers: auth
    end
    assert_response :internal_server_error
    assert_equal 'internal_error', body['error']['code']
    refute_match(/SELECT|users/, response.body)
    assert body['error']['details']['ref'].present?
  end

  test 'another property is isolated' do
    with_s3_uploads { get "#{BASE}/properties/#{@other.id}/graph", headers: auth }
    assert_response :success, response.body
    assert_equal @other.id, body['community_id']
    assert_equal "https://bucket.s3-accelerate.amazonaws.com/uploads/sitemap/image/#{sitemaps(:property_map).id}/MyString", body['levels'][0]['image']
    assert_equal TourApi::Engine.version(@other), body['version']
    assert_not_equal TourApi::Engine.version(@community), body['version']
    assert_equal ['sitemap'], body['levels'].map { |l| l['kind'] }
    assert_equal 'Property map', body['levels'][0]['name']
  end

  test 'no payload carries access codes or password hashes' do
    [@base, "#{@base}/stops", "#{@base}/map", "#{@base}/graph", "#{BASE}/properties", "#{BASE}/auth/me"].each do |path|
      get path, headers: auth
      assert_response :success, path
      refute_match(/access_code|encrypted_password|lock_code/, response.body, path)
    end
  end
end
