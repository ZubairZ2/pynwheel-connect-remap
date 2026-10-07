require 'test_helper'

class AutomatePlottingControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    sign_in users(:super_admin)
  end

  def body
    JSON.parse(response.body)
  end

  test 'the map JSON carries the new graph keys, versions and the token' do
    HallwayEdge.between!(hallways(:h1), hallways(:h2), kind: 'traced', path_points: [[150, 90]])
    get "/automate_plotting.json?community_id=#{@community.id}"
    assert_response :success
    data = body['data']
    assert_equal %w[manual confirmed raster], data['hallways'].first.values_at('source', 'review_status', 'space')
    assert_equal [[150, 90]], data['hallway_edges'].first['points']
    assert_equal 'elevator', data['elevators'].find { |row| row['id'] == elevators(:lift).id }['kind']
    assert_equal 'stairs', data['elevators'].find { |row| row['id'] == elevators(:north_stairs).id }['kind']
    assert_equal 2, data['levels'].size
    assert_equal({}, data['suppressions'])
    meta = body['meta']
    assert meta['csrf_token'].present?
    assert_equal 0, meta['versions']["floorplate:#{floorplates(:plate_a).id}"]
    assert_equal true, meta['writes_enabled']
    assert_equal true, meta['can_edit_map']
  end

  test 'shortest_path with from and to answers the route envelope' do
    get "/automate_plotting/shortest_path.json?community_id=#{@community.id}&from=unit:#{units(:plotted_unit).id}&to=unit:#{units(:plotted_unit_floor3).id}"
    assert_response :success
    assert body['data']['success']
    assert_equal %w[walk elevator walk], body['data']['legs'].map { |l| l['kind'] }
  end

  test 'shortest_path without a route answers 422 with the error taxonomy' do
    get "/automate_plotting/shortest_path.json?community_id=#{@community.id}&from=unit:999&to=unit:#{units(:plotted_unit).id}"
    assert_response :unprocessable_entity
    assert_equal 'unknown_endpoint', body['data']['error']['code']
  end

  test 'shortest_path without from keeps the legacy shape' do
    get "/automate_plotting/shortest_path.json?community_id=#{@community.id}&path_type=sorting"
    assert_response :success
    assert body.key?('path_object')
  end
end
