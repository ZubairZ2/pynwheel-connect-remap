require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

class Api::TourApp::V1::StopsTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  setup do
    build_tour_app_fixtures!
    @token = api_token_for(users(:super_admin))
  end

  teardown { reset_tour_api_caches! }

  def stops
    get "#{@base}/stops", headers: auth
    assert_response :success, response.body
    body
  end

  test 'groups and membership: Show in Stops List on and off, hidden stops, duplicates, tour order' do
    data = stops
    assert_equal @start, data['start_node']
    assert_equal @tour.id, data['tour_id']
    assert_equal TourApi::Engine.version(@community), data['graph_version']
    groups = data['groups'].index_by { |g| g['key'] }
    assert_equal 'Amenities', groups['amenities']['label']
    assert_equal 'Floorplans', groups['floorplans']['label']
    assert_equal [@gym_key], groups['amenities']['stops'].map { |s| s['id'] }, "the Gym is on; the Pool's Show in Stops List is off"
    unit_ids = groups['floorplans']['stops'].map { |s| s['id'] }
    assert_not_includes unit_ids, @u102, 'display_stop false is excluded'
    assert_equal 1, unit_ids.count(@u101), 'duplicate tour_stops rows collapse to one stop'
    assert_equal [@u101, @island_key, @u301, @u201], unit_ids, 'building order A then B; within A by floor then Tour Setup sort'
    assert_equal 5, data['total']
  end

  test 'the stop contract' do
    unit = all_stops(stops).find { |s| s['id'] == @u101 }
    assert_equal %w[id type record_id tour_stop_id name description instruction building floor level_id floorplate_id location map_node_id routable sort duration_minutes unit amenity], unit.keys
    assert_equal 'unit', unit['type']
    assert_equal @unit101.id, unit['record_id']
    assert_equal tour_stops(:unit_stop).id, unit['tour_stop_id'], 'the lowest tour_stops row, not the duplicate'
    assert_equal '101', unit['name']
    assert_equal 'Turn left at the lobby', unit['instruction']
    assert_equal ['A', 1], [unit['building'], unit['floor']]
    assert_equal [@level_a, @plate_a.id], [unit['level_id'], unit['floorplate_id']]
    assert_equal({ 'x' => 388.0, 'y' => 198.0 }, unit['location'], 'the door centre, since the unit has a door')
    assert_equal @u101, unit['map_node_id']
    assert_equal true, unit['routable']
    assert_equal 4, unit['duration_minutes']
    assert_equal({ 'bedrooms' => 2.0, 'bathrooms' => 2.0, 'square_feet' => 850.0, 'rent' => 2400.0, 'available' => true, 'model' => false, 'floorplan_name' => 'A1' }, unit['unit'])
    assert_nil unit['amenity']
    gym = all_stops(stops).find { |s| s['id'] == @gym_key }
    assert_equal 'Past the mailroom.', gym['instruction'], 'plain text from the rich-text field'
    assert_equal 'Open 24 hours', gym['description']
    assert_equal({ 'amenity_type' => 'Fitness', 'video_url' => nil, 'video_button_label' => 'PLAY VIDEO' }, gym['amenity'])
    assert_equal true, gym['routable']
    assert_nil gym['unit']
    assert_equal({ 'x' => 200.0, 'y' => 400.0 }, gym['location'], 'the pin, since the amenity has no door')
  end

  test 'a stop on an island is listed but not routable' do
    island = all_stops(stops).find { |s| s['id'] == @island_key }
    assert_equal false, island['routable'], 'its nearest hallway has no path'
    assert_equal @island_key, island['map_node_id']
    assert_equal @level_a, island['level_id']
  end

  test 'an unplotted stop has no location' do
    tour_stops(:unit_stop).update_columns(display_stop: true)
    @hidden_stop.update_columns(display_stop: true)
    reset_tour_api_caches!
    hidden = all_stops(stops).find { |s| s['id'] == @u102 }
    assert_nil hidden['location']
    assert_nil hidden['level_id']
    assert_nil hidden['map_node_id']
    assert_equal false, hidden['routable']
  end

  test 'no stops without a main tour' do
    TourStop.where(tour_id: @tour.id).delete_all
    @tour.delete
    reset_tour_api_caches!
    data = stops
    assert_equal 0, data['total']
    assert_nil data['tour_id']
    assert_nil data['start_node']
  end

  test 'turning Show in Stops List off through the CMS rule removes the stop' do
    TourStops::Membership.set!(community: @community, user: users(:super_admin), stop_type: 'amenity', stop_id: @gym.id, show: false)
    reset_tour_api_caches!
    assert_equal [], stops['groups'].find { |g| g['key'] == 'amenities' }['stops']
    TourStops::Membership.set!(community: @community, user: users(:super_admin), stop_type: 'amenity', stop_id: @gym.id, show: true)
    reset_tour_api_caches!
    assert_equal [@gym_key], stops['groups'].find { |g| g['key'] == 'amenities' }['stops'].map { |s| s['id'] }
  end
end
