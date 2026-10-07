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
    assert_equal %w[A B], body['buildings']
    assert_equal @start, body['tour']['start_node']
    assert_equal 1, body['tour']['starting_floor']
    assert_equal 'A', body['tour']['building']
    assert_equal 5, body['tour']['stops_total'], '101, 301, 201, Island (units) + Gym; not 102 (hidden), Pool (flag off), the elevator or the duplicate'
    assert_equal 3, body['floorplates_count']
    assert_equal Unit.where(community_id: @community.id, visible: true).count, body['units_count']
    assert_equal 2, body['amenities_count']
    assert_equal %w[id name address city state zip company tour_enabled is_sitemap success auto_wayfinding floorplates_count units_count amenities_count buildings tour graph_version], body.keys
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
