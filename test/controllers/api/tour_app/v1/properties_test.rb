require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

class Api::TourApp::V1::PropertiesTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  setup do
    build_tour_app_fixtures!
    @token = api_token_for(users(:super_admin))
    @quiet = communities(:no_tour_property)
  end

  teardown { reset_tour_api_caches! }

  test 'the property list' do
    get "#{BASE}/properties", headers: auth
    assert_response :success
    assert_equal Community.count, body['total']
    assert_equal Community.order(Arel.sql('lower(name), id')).pluck(:name), body['properties'].map { |p| p['name'] }
    quiet = body['properties'].find { |p| p['id'] == @quiet.id }
    assert_equal false, quiet['tour_enabled']
    assert_equal %w[id name address city state zip company tour_enabled is_sitemap], quiet.keys
    assert_equal 'MyString', quiet['company']
  end

  test 'the list near the phone: nearest first with the distance, within the radius, without coordinates in the answer' do
    denver = [39.7392, -104.9903]
    @community.update_columns(latitude: 39.7419, longitude: -104.9903)                       # ~300 m north
    communities(:sitemap_property).update_columns(latitude: 39.7662, longitude: -104.9903)  # ~3 km north
    @quiet.update_columns(latitude: nil, longitude: nil)
    get "#{BASE}/properties", params: { near: denver.join(',') }, headers: auth
    assert_response :success, response.body
    ids = body['properties'].map { |p| p['id'] }
    assert_equal [@community.id, communities(:sitemap_property).id], ids.first(2), 'nearest first'
    refute_includes ids, @quiet.id, 'a property without coordinates is not near anyone'
    first = body['properties'].first
    assert_in_delta 300, first['distance_m'], 20
    assert_in_delta 3000, body['properties'][1]['distance_m'], 50
    assert_equal %w[id name address city state zip company tour_enabled is_sitemap distance_m], first.keys, 'no latitude or longitude leaves the server'
    assert_equal body['properties'].size, body['total']

    get "#{BASE}/properties", params: { near: denver.join(','), radius_km: 1, limit: 1 }, headers: auth
    assert_equal [@community.id], body['properties'].map { |p| p['id'] }
    get "#{BASE}/properties", params: { near: denver.join(','), radius_km: 1 }, headers: auth
    assert_equal [@community.id], body['properties'].map { |p| p['id'] }, 'the radius cuts'
    get "#{BASE}/properties", params: { near: denver.join(','), tour_enabled: 'true', q: 'no tour' }, headers: auth
    assert_equal [], body['properties'], 'the other filters still apply'

    get "#{BASE}/properties", headers: auth
    refute body['properties'].first.key?('distance_m'), 'no distance without near'
    assert_includes body['properties'].map { |p| p['id'] }, @quiet.id

    get "#{BASE}/properties", params: { near: '39.7' }, headers: auth
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
    get "#{BASE}/properties", params: { near: '95,-104' }, headers: auth
    assert_response :unprocessable_entity
    get "#{BASE}/properties", params: { near: denver.join(','), limit: 0 }, headers: auth
    assert_response :unprocessable_entity
    get "#{BASE}/properties", params: { near: denver.join(','), radius_km: 9999 }, headers: auth
    assert_response :unprocessable_entity, 'the radius never exceeds the server cap'
  end

  test 'the list filters by tour_enabled and q' do
    get "#{BASE}/properties", params: { tour_enabled: 'true' }, headers: auth
    assert_equal [communities(:sitemap_property).id, @community.id], body['properties'].map { |p| p['id'] }
    get "#{BASE}/properties", params: { q: 'no tour' }, headers: auth
    assert_equal [@quiet.id], body['properties'].map { |p| p['id'] }
    get "#{BASE}/properties", params: { tour_enabled: 'maybe' }, headers: auth
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
  end

  test 'the detail of a tour property' do
    get @base, headers: auth
    assert_response :success
    assert_equal true, body['tour_enabled']
    assert_equal TourApi::Engine.version(@community), body['graph_version']
    assert_equal TourApi::ConfigVersion.for(@community), body['config_version']
    assert_nil body['published_at']
    assert_equal %w[A B], body['buildings']
    assert_equal @start, body['tour']['start_node']
    assert_equal 1, body['tour']['starting_floor']
    assert_equal 'A', body['tour']['building']
    assert_equal 5, body['tour']['stops_total'], '101, 301, 201, Island (units) + Gym; not 102 (hidden), Pool (flag off), the elevator or the duplicate'
    assert_equal 3, body['floorplates_count']
    assert_equal Unit.where(community_id: @community.id, visible: true).count, body['units_count']
    assert_equal 2, body['amenities_count']
    assert_equal %w[id name address city state zip company tour_enabled is_sitemap success auto_wayfinding floorplates_count units_count amenities_count buildings tour graph_version config_version published_at phone email verification_required capabilities], body.keys
    assert_equal({ 'visits' => true, 'visitor_auth' => true, 'location_required' => true, 'presence' => true }, body['capabilities'], 'the app reads what the server offers (October 23 and 28, 2026)')
    assert_equal true, body['verification_required'], 'the fixture tour has visual_id_verification on, so a staff session sees that the property asks'
  end

  test 'the detail tells the app whether to ask for the ID (October 28, 2026)' do
    @tour.update_columns(visual_id_verification: false)
    ann = TourUser.create!(first_name: 'Ann', last_name: 'Lee', name: 'Ann Lee', email: 'ann@example.test', phone_number: '+13035550101')
    visitor_token, = Visitors::Session.issue!(ann)
    get @base, headers: auth(visitor_token)
    assert_response :success
    assert_equal false, body['verification_required'], 'a property without visual_id_verification never asks'

    @tour.update_columns(visual_id_verification: true)
    reset_tour_api_caches!
    get @base, headers: auth(visitor_token)
    assert_response :success
    assert_equal true, body['verification_required'], 'a verified-ID property asks a visitor with no verification on file'
    get @base, headers: auth
    assert_equal true, body['verification_required'], 'a staff session sees that the property asks'

    ann.update_columns(is_checkpoint_verified: true, checkpoint_verified_at: Time.current)
    get @base, headers: auth(visitor_token)
    assert_equal false, body['verification_required'], 'a visitor verified within 30 days is not asked again'
  end

  test 'the detail of a property without the tour' do
    get "#{BASE}/properties/#{@quiet.id}", headers: auth
    assert_response :success
    assert_equal false, body['tour_enabled']
    assert_nil body['tour']
    assert_nil body['graph_version']
    assert_equal [], body['buildings']
  end

  test 'an unknown property is 404' do
    get "#{BASE}/properties/999999", headers: auth
    assert_response :not_found
    assert_equal 'not_found', body['error']['code']
  end

  test 'a property without the tour refuses every tour endpoint' do
    %w[stops map graph map/levels/floorplate:1].each do |path|
      get "#{BASE}/properties/#{@quiet.id}/#{path}", headers: auth
      assert_response :unprocessable_entity, path
      assert_equal 'tour_disabled', body['error']['code'], path
    end
    post_json("#{BASE}/properties/#{@quiet.id}/route", { from_stop_id: 'unit:1', to_stop_id: 'unit:2' })
    assert_response :unprocessable_entity
    assert_equal 'tour_disabled', body['error']['code']
    post_json("#{BASE}/properties/#{@quiet.id}/stops/distances", { stop_ids: ['unit:1'] })
    assert_equal 'tour_disabled', body['error']['code']
  end

  test 'nothing is written by the read endpoints' do
    counts = -> { [TourStop.count, Hallway.count, Doorkeeper::AccessToken.where(revoked_at: nil).count, @community.reload.updated_at] }
    before = counts.call
    get @base, headers: auth
    get "#{@base}/stops", headers: auth
    get "#{@base}/graph", headers: auth
    post_json("#{@base}/tour-route", { stop_ids: [@u101] })
    assert_equal before, counts.call
  end
end
