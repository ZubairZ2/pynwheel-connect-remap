require 'test_helper'

class HallwaysControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @level = floorplates(:plate_a)
    @h1 = hallways(:h1)
    @h4 = hallways(:h4)
  end

  def payload(extra = {})
    { request_id: SecureRandom.uuid, level: { kind: 'floorplate', id: @level.id }, base_version: @level.reload.wayfinding_version, space: 'raster', origin: 'edit',
      nodes: { add: [{ temp_key: 'j:1', x: 700, y: 100 }] }, edges: { add: [{ a: 'j:1', b: @h4.id }] } }.merge(extra)
  end

  def save_graph(body = payload, headers: {})
    put "/communities/#{@community.id}/wayfinding_graph.json", params: body, as: :json, headers: headers
  end

  def body
    JSON.parse(response.body)
  end

  test 'anonymous requests are refused' do
    save_graph
    assert_response :unauthorized
  end

  test 'a company admin of another company is forbidden' do
    sign_in users(:other_company_admin)
    save_graph
    assert_response :forbidden
    assert_equal 'forbidden', body['errors'].first['code']
    assert_equal 4, Hallway.on_level(@level).count
  end

  test 'a community assistant may not edit' do
    sign_in users(:community_assistant)
    save_graph
    assert_response :forbidden
  end

  test 'an assigned community admin saves the graph' do
    sign_in users(:community_admin)
    save_graph
    assert_response :success
    data = body['data']
    assert_equal @level.wayfinding_version + 1, data['level']['version']
    assert data['key_map']['j:1'].is_a?(Integer)
    assert_equal 5, data['hallways'].size
    assert_equal 1, data['hallway_edges'].size
    assert body['meta']['csrf_token'].present?
    assert_equal data['level']['version'], body['meta']['versions']["floorplate:#{@level.id}"]
  end

  test 'a super admin saves the graph' do
    sign_in users(:super_admin)
    save_graph
    assert_response :success
  end

  test 'a stale version answers 409 with the current graph' do
    sign_in users(:super_admin)
    save_graph(payload(base_version: 42))
    assert_response :conflict
    assert_equal 'stale_version', body['errors'].first['code']
    assert_equal @level.wayfinding_version, body['errors'].first['current_version']
    assert_equal 4, body['data']['hallways'].size
    assert_equal 4, Hallway.on_level(@level).count
  end

  test 'an invalid payload answers 422 with per-item errors and writes nothing' do
    sign_in users(:super_admin)
    save_graph(payload(nodes: { add: [{ temp_key: 'j:1', x: -5, y: 1 }] }, edges: {}))
    assert_response :unprocessable_entity
    assert_equal 'nodes.add[0]', body['errors'].first['path']
    assert_equal 4, Hallway.on_level(@level).count
  end

  test 'a foreign floorplate is not found, never a cross-tenant write' do
    sign_in users(:super_admin)
    save_graph(payload(level: { kind: 'floorplate', id: floorplates(:no_tour_plate).id }))
    assert_response :not_found
    assert_equal 'unknown_level', body['errors'].first['code']
  end

  test 'an unknown property is not found' do
    sign_in users(:super_admin)
    put '/communities/999999/wayfinding_graph.json', params: payload, as: :json
    assert_response :not_found
  end

  test 'the kill switch answers 404 disabled' do
    sign_in users(:super_admin)
    previous = ENV['PYN_CONNECT_WRITES']
    ENV['PYN_CONNECT_WRITES'] = 'off'
    save_graph
    assert_response :not_found
    assert_equal 'disabled', body['errors'].first['code']
  ensure
    ENV['PYN_CONNECT_WRITES'] = previous
  end

  test 'with forgery protection on, a missing token is a 403 csrf and the map token passes' do
    sign_in users(:super_admin)
    with_forgery_protection do
      save_graph
      assert_response :forbidden
      assert_equal 'csrf', body['errors'].first['code']
      get "/automate_plotting.json?community_id=#{@community.id}"
      assert_response :success
      token = body['meta']['csrf_token']
      assert token.present?
      save_graph(payload, headers: { 'X-CSRF-Token' => token })
      assert_response :success
    end
  end

  test 'a replayed detect run answers the first result' do
    sign_in users(:super_admin)
    detect = payload(origin: 'detect', request_id: 'detect-abc', edges: {})
    save_graph(detect)
    first = body['data']['key_map']
    save_graph(detect.merge(base_version: 0))
    assert_response :success
    assert body['data']['replayed']
    assert_equal first, body['data']['key_map']
  end

  # ── the legacy editor, pinned ───────────────────────────────────────────

  test 'legacy point_save still creates and chains a point and answers the level list' do
    sign_in users(:super_admin)
    post '/save_hallways_point', params: { floor_plate_id: @level.id, new_point: { x_plot: 10, y_plot: 20, selected: true, next_points: [] }.to_json, previous_point: { id: @h4.id }.to_json }
    assert_response :success
    rows = JSON.parse(response.body)
    assert_equal 5, rows.size
    created = Hallway.on_level(@level).order(:id).last
    assert_includes @h4.reload.next_points, created.id
    assert_equal false, @h4.selected
    assert_equal %w[id x_plot y_plot parent_type parent_id created_at updated_at next_points selected], rows.first.keys.first(9)
  end

  test 'legacy update_point, connect_leaf_point, save_selected_point and remove_point still work' do
    sign_in users(:super_admin)
    post '/update_hallways_point', params: { floor_plate_id: @level.id, current_id: @h1.id, x_plot: 111, y_plot: 112 }
    assert_response :success
    assert_equal [111.0, 112.0, true], [@h1.reload.x_plot, @h1.y_plot, @h1.selected]

    post '/connect_leaf_point', params: { floor_plate_id: @level.id, previous_id: @h4.id, current_id: @h1.id }
    assert_response :success
    assert_includes @h4.reload.next_points, @h1.id

    post '/save_selected_point', params: { floor_plate_id: @level.id, current_id: hallways(:h2).id }
    assert_response :success
    assert_equal [hallways(:h2).id], Hallway.on_level(@level).where(selected: true).pluck(:id)

    post '/delete_hallways_point', params: { floor_plate_id: @level.id, current_id: hallways(:h3).id }
    assert_response :success
    assert_nil Hallway.find_by(id: hallways(:h3).id)
    assert_equal 3, JSON.parse(response.body).size
  end

  test 'legacy renders hide pending and svg-space nodes' do
    sign_in users(:super_admin)
    @level.hallways.create!(x_plot: 1, y_plot: 1, review_status: 'pending', source: 'inferred')
    @level.hallways.create!(x_plot: 2, y_plot: 2, space: 'svg')
    post '/save_selected_point', params: { floor_plate_id: @level.id, current_id: @h1.id }
    post '/update_hallways_point', params: { floor_plate_id: @level.id, current_id: @h1.id, x_plot: 100, y_plot: 100 }
    assert_equal 4, JSON.parse(response.body).size
  end
end
