require 'test_helper'

class TourSetup::SaveTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    @tour = tours(:main_tour)
    @user = users(:super_admin)
  end

  def save(payload)
    TourSetup::Save.call(community: @community, user: @user, payload: { 'base_version' => @tour.reload.tour_setup_version }.merge(payload))
  end

  test 'adds, removes, hides, orders and times stops in one save' do
    result = save('stops' => {
                    'add' => [{ 'temp_key' => 'new:1', 'stop_type' => 'unit', 'stop_id' => units(:unplotted_unit).id, 'duration_minutes' => 4 }],
                    'remove' => [tour_stops(:lift_stop).id],
                    'visibility' => [{ 'id' => tour_stops(:unit_stop_floor3).id, 'visible' => false }],
                    'duration' => [{ 'id' => tour_stops(:unit_stop).id, 'duration_minutes' => 7 }],
                    'order' => ['new:1', tour_stops(:unit_stop_floor3).id, tour_stops(:unit_stop).id]
                  })
    added = TourStop.find(result.key_map['new:1'])
    assert_equal [4, 1], [added.duration_minutes, added.sort]
    assert_nil TourStop.find_by(id: tour_stops(:lift_stop).id)
    assert Elevator.exists?(elevators(:lift).id), 'removing an elevator stop keeps the elevator record'
    assert_equal false, tour_stops(:unit_stop_floor3).reload.display_stop
    assert_equal [2, 3], [tour_stops(:unit_stop_floor3).sort, tour_stops(:unit_stop).reload.sort]
    assert_equal 7, tour_stops(:unit_stop).duration_minutes
    assert_equal @tour.tour_setup_version + 1, result.version
  end

  test 'deletes an elevator record and its stops everywhere' do
    save('elevators' => { 'delete' => [elevators(:north_stairs).id] })
    assert_nil Elevator.find_by(id: elevators(:north_stairs).id)
  end

  test 'a stale version is refused' do
    assert_raises(Wayfinding::StaleVersion) do
      TourSetup::Save.call(community: @community, user: @user, payload: { 'base_version' => 99, 'stops' => { 'remove' => [tour_stops(:unit_stop).id] } })
    end
    assert TourStop.exists?(tour_stops(:unit_stop).id)
  end

  test 'adding a record that is already a stop does not duplicate it' do
    save('stops' => { 'add' => [{ 'temp_key' => 'new:1', 'stop_type' => 'unit', 'stop_id' => units(:plotted_unit).id }] })
    assert_equal 1, TourStop.where(tour_id: @tour.id, stop_type: 'unit', stop_id: units(:plotted_unit).id).count
  end

  test 'unknown stops and bad durations are refused together' do
    error = assert_raises(Wayfinding::Invalid) do
      save('stops' => { 'remove' => [999_999], 'duration' => [{ 'id' => tour_stops(:unit_stop).id, 'duration_minutes' => 'long' }] })
    end
    assert_equal %w[unknown_stop invalid], error.errors.map { |e| e[:code] }
  end
end
