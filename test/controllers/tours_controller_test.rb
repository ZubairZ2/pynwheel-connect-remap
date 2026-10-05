require 'test_helper'

class ToursControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @tour = tours(:main_tour)
  end

  def body
    JSON.parse(response.body)
  end

  test 'save_setup is refused anonymously and for read-only roles' do
    put "/communities/#{@community.id}/tours/save_setup.json", params: { base_version: 0 }, as: :json
    assert_response :unauthorized
    sign_in users(:community_assistant)
    put "/communities/#{@community.id}/tours/save_setup.json", params: { base_version: 0 }, as: :json
    assert_response :forbidden
  end

  test 'save_setup applies the tour setup in one save' do
    sign_in users(:community_manager)
    put "/communities/#{@community.id}/tours/save_setup.json", as: :json, params: {
      base_version: @tour.tour_setup_version,
      stops: { add: [{ temp_key: 'new:1', stop_type: 'amenity', stop_id: amenities(:gym).id }], visibility: [{ id: tour_stops(:unit_stop).id, visible: false }],
               order: ['new:1', tour_stops(:unit_stop).id, tour_stops(:unit_stop_floor3).id, tour_stops(:lift_stop).id] }
    }
    assert_response :success
    assert_equal @tour.tour_setup_version + 1, body['meta']['versions']['tour']
    stops = body['data']['tour']['tour_stops']
    assert_equal 4, stops.size
    assert_equal 'amenity', stops.first['stop_type']
    assert_equal false, stops.find { |s| s['id'] == tour_stops(:unit_stop).id }['display_stop']
  end

  test 'save_setup answers 409 on a stale version' do
    sign_in users(:super_admin)
    put "/communities/#{@community.id}/tours/save_setup.json", as: :json, params: { base_version: 77, stops: { remove: [tour_stops(:unit_stop).id] } }
    assert_response :conflict
    assert TourStop.exists?(tour_stops(:unit_stop).id)
  end

  test 'stop_list turns a unit on and off idempotently' do
    sign_in users(:community_admin)
    unit = units(:unplotted_unit)
    2.times do
      put "/communities/#{@community.id}/tours/stop_list.json", as: :json, params: { stop_type: 'unit', stop_id: unit.id, show: true }
      assert_response :success
      assert body['data']['in_stops_list']
    end
    assert_equal 1, TourStop.where(tour_id: @tour.id, stop_type: 'unit', stop_id: unit.id).count
    put "/communities/#{@community.id}/tours/stop_list.json", as: :json, params: { stop_type: 'unit', stop_id: unit.id, show: false }
    assert_response :success
    assert_equal false, body['data']['in_stops_list']
    assert_equal 0, TourStop.where(tour_id: @tour.id, stop_type: 'unit', stop_id: unit.id).count
  end

  test 'stop_list on a property without the tour is a 422' do
    sign_in users(:community_admin)
    put "/communities/#{communities(:no_tour_property).id}/tours/stop_list.json", as: :json, params: { stop_type: 'unit', stop_id: units(:no_tour_unit).id, show: true }
    assert_response :unprocessable_entity
    assert_equal 'tour_disabled', body['errors'].first['code']
  end

  test 'stop_list rejects other stop types and foreign records' do
    sign_in users(:super_admin)
    put "/communities/#{@community.id}/tours/stop_list.json", as: :json, params: { stop_type: 'elevator', stop_id: elevators(:lift).id, show: true }
    assert_response :unprocessable_entity
    put "/communities/#{@community.id}/tours/stop_list.json", as: :json, params: { stop_type: 'unit', stop_id: units(:no_tour_unit).id, show: true }
    assert_response :not_found
  end

  test 'the legacy display_stop toggle still works' do
    sign_in users(:super_admin)
    post "/communities/#{@community.id}/tours/display_stop", params: { stop_id: tour_stops(:unit_stop).id }
    assert_response :success
    assert_equal false, tour_stops(:unit_stop).reload.display_stop
  end
end
