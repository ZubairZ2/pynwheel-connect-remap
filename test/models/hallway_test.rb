require 'test_helper'

class HallwayTest < ActiveSupport::TestCase
  setup do
    @plate = floorplates(:plate_a)
    @h1 = hallways(:h1)
    @h2 = hallways(:h2)
  end

  test 'existing rows read as manual, confirmed, raster and routable' do
    assert_equal 'manual', @h1.source
    assert_equal 'confirmed', @h1.review_status
    assert_equal 'raster', @h1.space
    assert_includes Hallway.routable, @h1
  end

  test 'routable leaves out pending and svg-space nodes' do
    pending = @plate.hallways.create!(x_plot: 1, y_plot: 1, review_status: 'pending', source: 'inferred')
    svg = @plate.hallways.create!(x_plot: 1, y_plot: 1, space: 'svg')
    routable = Hallway.on_level(@plate).routable
    refute_includes routable, pending
    refute_includes routable, svg
    assert_includes routable, @h1
  end

  test 'a node created through the legacy association inherits its community' do
    node = @plate.hallways.create!(x_plot: 10, y_plot: 10, selected: true, next_points: [])
    assert_equal communities(:tour_property).id, node.community_id
  end

  test 'validates the enumerations' do
    assert_not Hallway.new(parent: @plate, x_plot: 1, y_plot: 1, source: 'magic').valid?
    assert_not Hallway.new(parent: @plate, x_plot: 1, y_plot: 1, review_status: 'maybe').valid?
    assert_not Hallway.new(parent: @plate, x_plot: 1, y_plot: 1, space: 'moon').valid?
  end

  test 'dropping an adjacency the legacy way prunes the edge row that decorated it' do
    edge = HallwayEdge.between!(@h1, @h2, kind: 'manual')
    @h1.update!(next_points: [])
    assert_nil HallwayEdge.find_by(id: edge.id)
  end

  test 'a pending edge row survives unrelated next_points changes' do
    edge = HallwayEdge.between!(@h1, hallways(:h3), kind: 'inferred', review_status: 'pending')
    @h1.update!(next_points: [])
    assert HallwayEdge.exists?(edge.id)
  end

  test 'every save moves the level version' do
    before = @plate.reload.wayfinding_version
    @h1.update!(x_plot: 101)
    assert_equal before + 1, @plate.reload.wayfinding_version
  end

  test 'destroying a level destroys its hallways and edge rows' do
    HallwayEdge.between!(@h1, @h2)
    ids = @plate.hallways.pluck(:id)
    @plate.destroy
    assert_empty Hallway.where(id: ids)
    assert_empty HallwayEdge.where(from_hallway_id: ids)
  end

  test 'linked_to? reads both sides and edge rows' do
    assert @h1.linked_to?(@h2)
    assert @h2.linked_to?(@h1)
    assert_not @h1.linked_to?(hallways(:h4))
  end
end
