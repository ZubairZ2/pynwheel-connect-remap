require 'test_helper'

class ElevatorTest < ActiveSupport::TestCase
  test 'existing rows are accessible elevators' do
    lift = elevators(:lift)
    assert lift.lift?
    assert lift.accessible
    assert_equal [300, 90], lift.position_on(2)
  end

  test 'kind is validated and stairs are stairs' do
    assert elevators(:north_stairs).stairs?
    assert_not Elevator.new(community: communities(:tour_property), floorplate_covering_range: '1-2', kind: 'rocket').valid?
  end

  test 'destroying an elevator removes its stops in every tour' do
    lift = elevators(:lift)
    copy = Tour.create!(community: communities(:tour_property))
    TourStop.create!(tour: copy, stop_type: 'elevator', stop_id: lift.id, name: lift.name)
    assert_equal 2, TourStop.where(stop_type: 'elevator', stop_id: lift.id).count
    lift.destroy!
    assert_equal 0, TourStop.where(stop_type: 'elevator', stop_id: lift.id).count
  end

  test 'a unit stop sharing the elevator id is not touched' do
    lift = elevators(:lift)
    unit_stop = TourStop.create!(tour: tours(:main_tour), stop_type: 'unit', stop_id: lift.id, name: 'shared id')
    lift.destroy!
    assert TourStop.exists?(unit_stop.id)
  end
end
