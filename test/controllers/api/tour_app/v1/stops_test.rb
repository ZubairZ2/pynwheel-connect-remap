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
    assert_equal %w[id type record_id tour_stop_id name description instruction building floor level_id floorplate_id location map_node_id routable sort duration_minutes unit amenity lock media], unit.keys
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
    assert_equal({ 'bedrooms' => 2.0, 'bathrooms' => 2.0, 'square_feet' => 850.0, 'rent' => 2400.0, 'available' => true, 'model' => false, 'floorplan_name' => 'A1',
                   'unit_type' => nil, 'available_date' => nil, 'availability' => nil, 'lease_terms' => [], 'deposit' => nil, 'additional_fee' => nil, 'virtual_tour_url' => nil }, unit['unit'])
    assert_nil unit['amenity']
    assert_nil unit['lock'], 'no lock provider on the unit or its door'
    assert_equal({ 'image' => nil, 'floorplan_image' => nil, 'photos' => [], 'virtual_tour_url' => nil }, unit['media'], 'no uploads on the fixture unit')
    gym = all_stops(stops).find { |s| s['id'] == @gym_key }
    assert_equal 'Past the mailroom.', gym['instruction'], 'plain text from the rich-text field'
    assert_equal 'Open 24 hours', gym['description']
    assert_equal({ 'amenity_type' => 'Fitness', 'video_url' => nil, 'video_button_label' => 'PLAY VIDEO' }, gym['amenity'])
    assert_equal true, gym['routable']
    assert_nil gym['unit']
    assert_equal({ 'x' => 200.0, 'y' => 400.0 }, gym['location'], 'the pin, since the amenity has no door')
    assert_equal({ 'image' => nil, 'floorplan_image' => nil, 'photos' => [], 'virtual_tour_url' => nil }, gym['media'])
  end

  test 'the detail facts come from the CMS columns: availability date, lease terms by the kiosk rule, deposit, fees, media' do
    @unit101.update_columns(available_date: Date.new(2026, 11, 15), unit_type: 'Apartment', availability: 'Unoccupied', lease_pricing: '12:2750::;6:2900::;3:0::;13:2732::', virtual_tour_url: 'https://my.matterport.com/show/?m=abc')
    @floorplan.update_columns(deposit: '500', image: 'plan.png', standard_image_url: 'https://bucket.s3.us-west-2.amazonaws.com/uploads/floorplan/image/1/plan.png')
    @community.update_columns(display_pricing_options: true, display_additional_fee: true, additional_fee: '<p>Admin fee $250</p>')
    @gym.update_columns(image: 'gym.jpg', standard_image_url: 'https://bucket.s3.us-west-2.amazonaws.com/uploads/amenity/image/1/gym.jpg')
    gallery = AmenityGallery.new(amenity_id: @gym.id, name: 'Weights')
    gallery.write_attribute(:image, 'weights.jpg')
    gallery.save!(validate: false)
    reset_tour_api_caches!
    data = with_s3_uploads { stops }
    unit = all_stops(data).find { |s| s['id'] == @u101 }['unit']
    assert_equal '2026-11-15', unit['available_date']
    assert_equal 'Apartment', unit['unit_type']
    assert_equal 'Unoccupied', unit['availability']
    assert_equal [{ 'months' => 6, 'rent' => 2900.0 }, { 'months' => 12, 'rent' => 2750.0 }, { 'months' => 13, 'rent' => 2732.0 }], unit['lease_terms'], 'sorted by term, entries without a rent dropped'
    assert_equal 500.0, unit['deposit']
    assert_equal 'Admin fee $250', unit['additional_fee'], 'plain text of the property fee'
    assert_equal 'https://my.matterport.com/show/?m=abc', unit['virtual_tour_url']
    media = all_stops(data).find { |s| s['id'] == @u101 }['media']
    assert_equal "https://bucket.s3-accelerate.amazonaws.com/uploads/floorplan/image/#{@floorplan.id}/plan.png", media['floorplan_image'], 'the floor plan image through S3 acceleration'
    gym = all_stops(data).find { |s| s['id'] == @gym_key }['media']
    assert_match %r{/uploads/amenity/image/#{@gym.id}/gym.jpg\z}, gym['image']
    assert_equal [{ 'id' => gallery.id, 'name' => 'Weights', 'url' => "https://bucket.s3-accelerate.amazonaws.com/uploads/amenity_gallery/image/#{gallery.id}/weights.jpg" }], gym['photos']
    @community.update_columns(display_pricing_options: false)
    reset_tour_api_caches!
    assert_equal [], all_stops(stops).find { |s| s['id'] == @u101 }['unit']['lease_terms'], 'no lease terms while the property hides pricing options'
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
