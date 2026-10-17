require 'test_helper'

class Connect::StopsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @tour = tours(:main_tour)
    @gym_stop = TourStop.create!(tour: @tour, stop_type: 'amenity', stop_id: amenities(:gym).id, name: 'Gym', sort: 0, display_stop: true)
    @hidden = TourStop.create!(tour: @tour, stop_type: 'unit', stop_id: units(:unplotted_unit).id, name: '102', sort: 9, display_stop: false)
  end

  def body
    JSON.parse(response.body)
  end

  def base
    "/communities/#{@community.id}/connect/stops"
  end

  test 'the rows carry the record, its gaps and its lock' do
    amenities(:gym).update_columns(lock_provider: 'Igloohome')
    sign_in users(:community_assistant)
    get "#{base}.json"
    assert_response :success
    rows = body['data']['stops']
    assert_equal [@gym_stop.id, tour_stops(:unit_stop).id, tour_stops(:unit_stop_floor3).id, tour_stops(:lift_stop).id, @hidden.id], rows.map { |r| r['id'] }
    gym = rows.first
    assert_equal 'Gym', gym['name']
    assert gym['record']['plotted']
    assert_equal 'Igloohome', gym['lock']['provider']
    assert gym['lock']['missing']
    assert_includes gym['issues'], 'no_lock'
    assert_includes gym['issues'], 'no_image'
    assert_includes gym['issues'], 'no_instructions'
    refute_includes gym['issues'], 'no_pin'
    hidden = rows.last
    assert_equal false, hidden['visible']
    assert_includes hidden['issues'], 'no_pin'
    unit = rows[1]
    assert_equal 'Door', unit['holder']['type'], 'a unit with a door holds its lock there'
    assert_equal %w[description instructions virtual_tour_url], unit['record']['editable']
    assert_equal @tour.reload.tour_setup_version, body["data"]["tour"]["tour_setup_version"]
  end

  test 'another property reads as not found' do
    sign_in users(:other_company_admin)
    get "#{base}.json"
    assert_response :not_found
  end

  test 'update writes the record columns, bumps the tour version and validates' do
    sign_in users(:community_manager)
    before = @tour.reload.tour_setup_version
    put "#{base}/#{@gym_stop.id}.json", as: :json, params: { instructions: 'Past the mailroom', description: 'Open 24 hours', video_link: 'https://vimeo.com/1' }
    assert_response :success
    gym = amenities(:gym).reload
    assert_equal ['Past the mailroom', 'Open 24 hours', 'https://vimeo.com/1'], [gym.directional_text, gym.description, gym.video_link]
    assert_equal before + 1, @tour.reload.tour_setup_version
    row = body['data']['stops'].find { |r| r['id'] == @gym_stop.id }
    refute_includes row['issues'], 'no_instructions'

    put "#{base}/#{@gym_stop.id}.json", as: :json, params: { video_link: 'not a link' }
    assert_response :unprocessable_entity
    assert_equal 'video_link', body['errors'].first['path']

    put "#{base}/#{tour_stops(:lift_stop).id}.json", as: :json, params: { name: 'Lift A', instructions: 'Press L' }
    assert_response :success
    assert_equal ['Lift A', 'Press L'], [elevators(:lift).reload.name, elevators(:lift).directional_text]
    assert_equal 'Lift A', tour_stops(:lift_stop).reload.name

    put "#{base}/#{tour_stops(:unit_stop).id}.json", as: :json, params: { name: 'renamed' }
    assert_response :unprocessable_entity, 'a unit\'s name lives in Inventory'
    assert_equal 'nothing_to_save', body['errors'].first['code']
  end

  test 'update is refused to read-only roles and for stops of another tour' do
    sign_in users(:community_assistant)
    put "#{base}/#{@gym_stop.id}.json", as: :json, params: { instructions: 'x' }
    assert_response :forbidden
    sign_in users(:super_admin)
    put "#{base}/999999.json", as: :json, params: { instructions: 'x' }
    assert_response :not_found
  end
end
