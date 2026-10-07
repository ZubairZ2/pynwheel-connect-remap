require 'test_helper'

class Api::SelfTour::V1::WayfindingControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @base = "/api/self_tour/v1/communities/#{@community.id}"
  end

  def with_api_access
    previous = ENV['API_ACCESS']
    ENV['API_ACCESS'] = 'true'
    yield
  ensure
    ENV['API_ACCESS'] = previous
  end

  def body
    JSON.parse(response.body)
  end

  test 'without a token the legacy refusal is answered' do
    previous = ENV['API_ACCESS']
    ENV['API_ACCESS'] = 'false'
    get "#{@base}/wayfinding.json"
    assert_equal 401, body['success_code']
  ensure
    ENV['API_ACCESS'] = previous
  end

  test 'the graph is answered with an ETag and nothing is written' do
    with_api_access do
      deleted_ids = @community.deleted_ids
      get "#{@base}/wayfinding.json"
      assert_response :success
      assert body['success']
      assert body['nodes'].any? { |n| n['kind'] == 'unit' }
      assert body['nodes'].any? { |n| n['kind'] == 'hallway' }
      assert_equal 2, body['vertical_connections'].size
      refute_match(/access_code/, response.body)
      etag = response.headers['ETag']
      assert etag.present?
      get "#{@base}/wayfinding.json", headers: { 'If-None-Match' => etag }
      assert_response :not_modified
      assert_equal deleted_ids, @community.reload.deleted_ids
    end
  end

  test 'a route and the tour route are answered' do
    with_api_access do
      get "#{@base}/wayfinding/route.json?from=unit:#{units(:plotted_unit).id}&to=unit:#{units(:plotted_unit_floor3).id}&step_free=1"
      assert_response :success
      assert_equal %w[walk elevator walk], body['legs'].map { |l| l['kind'] }
      get "#{@base}/wayfinding/tour_route.json"
      assert_response :success
      assert body['legs'].size >= 3
    end
  end

  test 'errors use the shared taxonomy' do
    with_api_access do
      get "#{@base}/wayfinding/route.json?from=unit:1&to=unit:#{units(:plotted_unit).id}"
      assert_response :unprocessable_entity
      assert_equal 'unknown_endpoint', body['error']['code']
    end
  end

  test 'a property without the tour is refused' do
    with_api_access do
      get "/api/self_tour/v1/communities/#{communities(:no_tour_property).id}/wayfinding.json"
      assert_response :unprocessable_entity
      assert_equal 'wayfinding_disabled', body['error']['code']
    end
  end
end
