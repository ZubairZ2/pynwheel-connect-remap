require 'test_helper'

class WayfindingStopTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    @plate = floorplates(:plate_a)
  end

  def build(attrs = {})
    WayfindingStop.new({ community: @community, map: @plate, kind: 'restroom', name: 'Lobby restroom', x_plot: 10, y_plot: 20 }.merge(attrs))
  end

  test 'a placed destination stop is valid and duck-types the legacy stop' do
    stop = build(note: 'Past the mailroom')
    assert stop.valid?, stop.errors.full_messages.join(', ')
    assert_equal 'Past the mailroom', stop.directional_text
    assert_equal [1], build(floor: 1).floors
    assert_nil stop.floors
    assert stop.placed?
  end

  test 'kind, note length, radius and floor are validated' do
    assert_not build(kind: 'teleport').valid?
    assert_not build(note: 'x' * 501).valid?
    assert_not build(radius_px: 10).valid?
    assert build(kind: 'blocker', radius_px: 10).valid?
    assert_not build(floor: 9).valid?
    assert_not build(x_plot: 1, y_plot: nil).valid?
  end

  test 'saving moves the level version' do
    before = @plate.reload.wayfinding_version
    build.save!
    assert_equal before + 1, @plate.reload.wayfinding_version
  end
end
