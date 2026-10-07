require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

class Api::TourApp::V1::RoutingTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  setup do
    build_tour_app_fixtures!
    @token = api_token_for(users(:super_admin))
    @lift_key = "elevator:#{@lift.id}"
    @stairs_key = "elevator:#{@stairs.id}"
  end

  teardown { reset_tour_api_caches! }

  def route(**payload)
    post_json("#{@base}/route", payload)
    body
  end

  test 'a same-floor route: legs, floors, stages and the step texts' do
    r = route(from_stop_id: @start, to_stop_id: @gym_key)
    assert_response :success, response.body
    assert_equal %w[success graph_version route], r.keys
    route = r['route']
    assert_equal({ 'id' => @start, 'type' => 'tour_start', 'name' => 'Main Tour' }, route['start'])
    assert_equal 'Gym', route['destination']['name']
    assert_equal ['walk'], route['legs'].map { |l| l['kind'] }
    assert_equal [1, @level_a], [route['legs'][0]['floor'], route['legs'][0]['level']]
    assert route['total_distance'].positive?
    assert_equal 'px', route['unit']
    assert_nil route['total_distance_ft']
    assert_nil route['duration_s']
    assert_equal [{ 'level_id' => @level_a, 'number' => 1, 'name' => 'Floor 1' }], route['floors']
    assert_equal [{ 'level_id' => @level_a, 'floor' => 1, 'building' => 'A', 'leg' => 0 }], route['stages']
    steps = route['steps']
    assert_equal %w[walk arrive], steps.map { |s| s['type'] }
    walk, arrive = steps
    assert_equal %w[sequence type title description instruction distance unit distance_ft floor from to leg geometry transition dwell_s], walk.keys
    assert_equal 'Walk on Floor 1', walk['title']
    assert_equal "From Main Tour to Gym · #{TourApi::Text.delimited(route['total_distance'].round)} px", walk['description']
    assert_in_delta route['total_distance'], walk['distance'], 0.11
    assert_equal [98.0, 100.0], walk['geometry'][0], 'the tour start icon centre'
    assert_equal ['Main Tour', 'Gym', 'Floor 1'], [walk['from']['name'], walk['to']['name'], walk['floor']['name']]
    assert_nil walk['transition']
    assert_equal ['Arrive at Gym', 'Floor 1'], [arrive['title'], arrive['description']]
    assert_equal 'Past the mailroom.', arrive['instruction'], "the stop's own directional text, as plain text"
    assert_equal 0.0, arrive['distance']
  end

  test 'a cross-floor route rides the elevator and tells the app which level to show' do
    r = route(from_stop_id: @u101, to_stop_id: @u301)
    assert_response :success, response.body
    route = r['route']
    assert_equal %w[walk elevator walk], route['legs'].map { |l| l['kind'] }
    lift = route['legs'][1]
    assert_equal [@lift_key, 1, 3, 0.0], [lift['via'], lift['floor_from'], lift['floor_to'], lift['length_px']]
    assert_equal %w[walk elevator walk arrive], route['steps'].map { |s| s['type'] }
    assert_equal ['Take Elevator 1 to Floor 3', 'Up 2 floors'], [route['steps'][1]['title'], route['steps'][1]['description']]
    assert_equal({ 'kind' => 'elevator', 'via' => @lift_key, 'name' => 'Elevator 1', 'floor_from' => 1, 'floor_to' => 3, 'from_level_id' => @level_a, 'to_level_id' => @level_a }, route['steps'][1]['transition'])
    assert_equal({ 'level_id' => nil, 'number' => 3, 'name' => 'Floor 3' }, route['steps'][1]['floor'])
    assert_equal 'Walk on Floor 3', route['steps'][2]['title']
    assert_equal [1, 3], route['floors'].map { |f| f['number'] }
    assert_equal [[1, 0], [3, 2]], route['stages'].map { |s| [s['floor'], s['leg']] }
    assert_equal ['Arrive at 301', 'Floor 3'], [route['steps'][-1]['title'], route['steps'][-1]['description']]
  end

  test 'the stairs are taken when they are the shorter way' do
    r = route(from_stop_id: @stairs_key, to_stop_id: @u301, from_floor: 1)
    assert_response :success, response.body
    assert_includes r['route']['legs'].map { |l| l['kind'] }, 'stairs'
    stairs = r['route']['steps'].find { |s| s['type'] == 'stairs' }
    assert_equal 'Take the stairs to Floor 3', stairs['title']
    assert_equal 'stairs', stairs['transition']['kind']
  end

  test 'a step-free route leaves the inaccessible stairs out' do
    r = route(from_stop_id: @stairs_key, to_stop_id: @u301, from_floor: 1, step_free: true)
    assert_response :success, response.body
    assert r['route']['step_free']
    assert r['route']['legs'].none? { |l| l['kind'] == 'stairs' }, 'the lift still links the floors'
    @lift.update_columns(accessible: false)
    reset_tour_api_caches!
    r = route(from_stop_id: @u101, to_stop_id: @u301, step_free: true)
    assert_response :unprocessable_entity
    assert_equal 'no_step_free', r['error']['code']
    assert_equal TourApi::Engine.version(@community), r['error']['details']['graph_version']
  end

  test 'a connector on several floors needs its floor' do
    r = route(from_stop_id: @lift_key, to_stop_id: @u301)
    assert_response :unprocessable_entity
    assert_equal 'ambiguous_floor', r['error']['code']
    assert_equal({ 'from' => @lift_key, 'to' => @u301 }, r['error']['details'].slice('from', 'to'))
  end

  test 'a destination nothing reaches is not linked' do
    r = route(from_stop_id: @u101, to_stop_id: @island_key)
    assert_response :unprocessable_entity
    assert_equal 'not_linked', r['error']['code']
    assert_includes r['error']['message'], 'Island'
  end

  test 'a blocker cuts the corridor and the error says so' do
    WayfindingStop.create!(community: @community, map: @plate_a, kind: 'blocker', name: 'Wet floor', x_plot: 308, y_plot: 200, radius_px: 30)
    reset_tour_api_caches!
    r = route(from_stop_id: @u101, to_stop_id: @gym_key)
    assert_response :unprocessable_entity
    assert_equal 'blocked', r['error']['code']
    r = route(from_stop_id: @u101, to_stop_id: @gym_key, avoid_blockers: false)
    assert_response :success, response.body
    assert_equal false, r['route']['avoid_blockers']
  end

  test 'invalid endpoints and bodies' do
    r = route(from_stop_id: 'unit:424242', to_stop_id: @u101)
    assert_response :unprocessable_entity
    assert_equal 'unknown_endpoint', r['error']['code']
    r = route(from_stop_id: @u101, to_stop_id: @u101)
    assert_equal 'same_endpoint', r['error']['code']
    r = route(from_stop_id: @u101)
    assert_response :unprocessable_entity
    assert_equal 'validation_error', r['error']['code']
    assert_equal [{ 'loc' => %w[body to_stop_id], 'message' => 'Field required' }], r['error']['details']
    r = route(from_stop_id: @u101, to_stop_id: @u301, from_floor: 'x')
    assert_equal 'validation_error', r['error']['code']
    r = route(from_stop_id: @u101, to_stop_id: @u301, step_free: 'maybe')
    assert_equal 'validation_error', r['error']['code']
  end

  test 'a cross-building route goes outdoors between the gates' do
    r = route(from_stop_id: @start, to_stop_id: @u201)
    assert_response :success, response.body
    kinds = r['route']['legs'].map { |l| l['kind'] }
    assert_includes kinds, 'outdoor'
    outdoor = r['route']['steps'].find { |s| s['type'] == 'outdoor' }
    assert_equal 'Walk outside to Tower B entrance', outdoor['title']
    assert_equal 'Leave by Main Tour, enter by Tower B entrance', outdoor['description']
    assert_equal ['outdoor', @level_a, @level_c], [outdoor['transition']['kind'], outdoor['transition']['from_level_id'], outdoor['transition']['to_level_id']]
    assert_nil outdoor['floor']
    assert_equal %w[A B], r['route']['buildings']
    assert_equal 'Use the side gate', r['route']['steps'][-1]['instruction'] if r['route']['steps'][-1]['to']['id'] == "bsp:#{@gate_b.id}"
  end

  test 'the tour route orders the chosen stops by the tour rule and keeps one segment per stop' do
    post_json("#{@base}/tour-route", { stop_ids: [@u301, @gym_key, @u101, @u201, @u101] })
    assert_response :success, response.body
    assert_equal %w[success graph_version route segments skipped], body.keys
    assert_equal [@gym_key, @u101, @u301, @u201], body['segments'].map { |s| s['stop_id'] }, 'building order, floor, Tour Setup sort; duplicates collapse'
    first = body['segments'][0]
    assert_equal [@start, @gym_stop.id], [first['from_stop_id'], first['tour_stop_id']]
    assert_equal ['arrive', 180], [first['route']['steps'][-1]['type'], first['route']['steps'][-1]['dwell_s']]
    second = body['segments'][1]
    assert_equal [@gym_key, 240], [second['from_stop_id'], second['route']['steps'][-1]['dwell_s']]
    whole = body['route']
    assert_equal [@start, @start], [whole['start']['id'], whole['destination']['id']]
    assert_equal 'Walk on Floor 1', whole['steps'][0]['title']
    assert_equal 5, whole['steps'].count { |s| s['type'] == 'arrive' }, 'four stops plus the return to the start'
    assert_equal [], body['skipped']
    assert_equal whole['legs'].size, body['segments'].sum { |s| s['route']['legs'].size } + whole['legs'].count { |l| l['index'] >= body['segments'].sum { |s| s['route']['legs'].size } }
    assert_equal (0...whole['legs'].size).to_a, whole['legs'].map { |l| l['index'] }
  end

  test 'a stop the route cannot reach is skipped with a warning' do
    post_json("#{@base}/tour-route", { stop_ids: [@island_key, @u101] })
    assert_response :success, response.body
    assert_equal [@u101], body['segments'].map { |s| s['stop_id'] }
    assert_equal [@island_key], body['skipped']
    assert body['route']['warnings'].any? { |w| w.include?('Island') }
  end

  test 'stops that are not on the list are rejected before any routing' do
    post_json("#{@base}/tour-route", { stop_ids: [@u101, @u102, @pool_key, 'unit:777'] })
    assert_response :unprocessable_entity
    assert_equal 'invalid_stop', body['error']['code']
    assert_equal [@u102, @pool_key, 'unit:777'], body['error']['details']['invalid_stops']
    post_json("#{@base}/tour-route", { stop_ids: [] })
    assert_equal 'validation_error', body['error']['code']
  end

  test 'distances from the tour start' do
    post_json("#{@base}/stops/distances", { stop_ids: [@u101, @u301, @island_key, 'unit:777'] })
    assert_response :success, response.body
    assert_equal @start, body['from_stop_id']
    d = body['distances']
    assert_equal %w[reachable distance unit distance_ft duration_s direction error], d[@u101].keys
    assert d[@u101]['reachable']
    assert_equal 'level', d[@u101]['direction']
    assert d[@u101]['distance'].positive?
    assert_nil d[@u101]['error']
    assert_equal [true, 'up'], [d[@u301]['reachable'], d[@u301]['direction']]
    assert_equal [false, 'not_linked'], [d[@island_key]['reachable'], d[@island_key]['error']['code']]
    assert_equal [false, 'unknown_endpoint'], [d['unit:777']['reachable'], d['unit:777']['error']['code']]
  end
end
