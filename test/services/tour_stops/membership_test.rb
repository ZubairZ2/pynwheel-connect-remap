require 'test_helper'

class TourStops::MembershipTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    @user = users(:super_admin)
    @tour = tours(:main_tour)
  end

  def set(record, show)
    TourStops::Membership.set!(community: @community, user: @user, stop_type: record.class.name.underscore, stop_id: record.id, show: show)
  end

  test 'turning a unit on creates exactly one stop, however often it is repeated' do
    unit = units(:unplotted_unit)
    3.times { set(unit, true) }
    stops = TourStop.where(tour_id: @tour.id, stop_type: 'unit', stop_id: unit.id)
    assert_equal 1, stops.count
    assert stops.first.display_stop
    assert_equal '102', stops.first.name
  end

  test 'turning a unit off removes the stop and leaves the unit alone' do
    unit = units(:plotted_unit)
    before = unit.attributes.except('updated_at')
    set(unit, false)
    set(unit, false)
    assert_not TourStop.where(tour_id: @tour.id, stop_type: 'unit', stop_id: unit.id).exists?
    assert_equal before, unit.reload.attributes.except('updated_at')
  end

  test 'a hidden stop turned on becomes visible instead of a second stop' do
    tour_stops(:unit_stop).update!(display_stop: false)
    set(units(:plotted_unit), true)
    stops = TourStop.where(tour_id: @tour.id, stop_type: 'unit', stop_id: units(:plotted_unit).id)
    assert_equal [true], stops.pluck(:display_stop)
  end

  test 'an amenity toggles its stop and the form flag together, nothing else' do
    gym = amenities(:gym)
    set(gym, true)
    assert TourStop.where(tour_id: @tour.id, stop_type: 'amenity', stop_id: gym.id).exists?
    assert gym.reload.breezway_lock_visible
    set(gym, false)
    assert_not TourStop.where(tour_id: @tour.id, stop_type: 'amenity', stop_id: gym.id).exists?
    assert_equal false, gym.reload.breezway_lock_visible
    assert_equal ['Gym', 'Open 24 hours', 200, 400], [gym.name, gym.description, gym.x_plot, gym.y_plot]
  end

  test 'a property without the tour cannot have stops' do
    error = assert_raises(Wayfinding::Invalid) do
      TourStops::Membership.set!(community: communities(:no_tour_property), user: @user, stop_type: 'unit', stop_id: units(:no_tour_unit).id, show: true)
    end
    assert_equal 'tour_disabled', error.errors.first[:code]
  end

  test 'a record of another property is not found' do
    assert_raises(Wayfinding::NotFound) { set(units(:no_tour_unit), true) }
  end

  test 'the tour version moves only when something changed' do
    unit = units(:unplotted_unit)
    before = @tour.reload.tour_setup_version
    set(unit, true)
    assert_equal before + 1, @tour.reload.tour_setup_version
    set(unit, true)
    assert_equal before + 1, @tour.reload.tour_setup_version
  end
end
