require 'test_helper'

class Wayfinding::RouteServiceTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    @unit1 = "unit:#{units(:plotted_unit).id}"
    @unit3 = "unit:#{units(:plotted_unit_floor3).id}"
    @gym = "amenity:#{amenities(:gym).id}"
  end

  def route(from, to, **options)
    Wayfinding::RouteService.new(@community, from: from, to: to, **options).call
  end

  test 'the graph attaches stops to their nearest routable node unless told otherwise' do
    graph = Wayfinding::GraphBuilder.new(@community).build
    assert_equal "hallway:#{hallways(:h2).id}", graph.nodes[@unit1].attach
    assert_equal 'nearest', graph.nodes[@unit1].link
    assert_equal 'door', graph.nodes[@unit1].anchor
    assert_equal "hallway:#{hallways(:h4).id}", graph.nodes[@unit3].attach
    assert_equal "hallway:#{hallways(:h2).id}", graph.nodes["elevator:#{elevators(:lift).id}"].attach
    assert_equal 'stairs', graph.nodes["elevator:#{elevators(:north_stairs).id}"].vertical
    assert_equal 2, graph.levels.size
    assert_equal [1, 2, 3], graph.levels.first.copies
  end

  test 'routes across floors through the elevator with legs and steps' do
    result = route(@unit1, @unit3)
    assert result.ok, result.error.inspect
    assert_equal %w[walk elevator walk], result.legs.map(&:kind)
    assert_equal [1, 3], [result.legs.first.floor, result.legs.last.floor]
    assert_equal "elevator:#{elevators(:lift).id}", result.legs[1].via
    assert_equal %w[walk elevator walk arrive], result.steps.map { |s| s[:kind] }
    assert_includes result.steps[1][:title], 'Elevator 1'
    assert result.length_px.positive?
    assert_nil result.length_ft, 'no scale stored, so no feet'
  end

  test 'two single-floor levels are joined by the shared elevator, never by a walk' do
    result = route(@unit1, "hallway:#{hallways(:h6).id}")
    assert result.ok, result.error.inspect
    assert_equal %w[walk elevator walk], result.legs.map(&:kind)
    assert_equal [1, 5], [result.legs[1].floor_from, result.legs[1].floor_to]
    assert_equal "floorplate:#{floorplates(:plate_b).id}", result.legs.last.level_key
  end

  test 'a step-free route refuses stairs when the lift is not accessible' do
    elevators(:lift).update!(accessible: false)
    result = route(@unit1, @unit3, step_free: true)
    assert_not result.ok
    assert_equal 'no_step_free', result.error[:code]
    assert route(@unit1, @unit3, step_free: false).ok
  end

  test 'a blocker cuts the corridor and the error says so' do
    WayfindingStop.create!(community: @community, map: floorplates(:plate_a), kind: 'blocker', name: 'Wet floor', x_plot: 308, y_plot: 200, radius_px: 30)
    result = route(@unit1, @gym)
    assert_not result.ok
    assert_equal 'blocked', result.error[:code]
    assert route(@unit1, @gym, avoid_blockers: false).ok
  end

  test 'a detached stop is not linked' do
    HallwayAttachment.create!(attachable: units(:plotted_unit), parent: floorplates(:plate_a), community_id: @community.id, mode: 'detached')
    result = route(@unit1, @gym)
    assert_equal 'not_linked', result.error[:code]
  end

  test 'an explicit link is honoured' do
    HallwayAttachment.create!(attachable: units(:plotted_unit), parent: floorplates(:plate_a), community_id: @community.id, mode: 'explicit', hallway: hallways(:h1))
    graph = Wayfinding::GraphBuilder.new(@community).build
    assert_equal ["hallway:#{hallways(:h1).id}", 'explicit'], [graph.nodes[@unit1].attach, graph.nodes[@unit1].link]
  end

  test 'unknown and identical endpoints are errors' do
    assert_equal 'unknown_endpoint', route('unit:999999', @gym).error[:code]
    assert_equal 'same_endpoint', route(@gym, @gym).error[:code]
  end

  test 'the whole tour routes start to stops and back' do
    result = Wayfinding::RouteService.new(@community).tour
    assert result.ok, result.error.inspect
    assert result.legs.size >= 3
    assert_equal "tour_start:#{tours(:main_tour).id}", result.legs.first.from
    assert_equal "tour_start:#{tours(:main_tour).id}", result.legs.last.to
    assert_includes result.steps.map { |s| s[:kind] }, 'arrive'
  end

  test 'the Tour App serializer exposes domain concepts without access codes' do
    graph = Wayfinding::GraphBuilder.new(@community).build
    json = Wayfinding::GraphSerializer.new(graph, version: 'wf-test', base_url: 'http://test.host').as_json
    assert_equal %w[floorplate floorplate], json[:levels].map { |l| l[:kind] }
    unit = json[:nodes].find { |n| n[:id] == @unit1 }
    assert_equal ['unit', "hallway:#{hallways(:h2).id}", 'nearest'], [unit[:kind], unit[:attach], unit[:link]]
    hallway = json[:nodes].find { |n| n[:id] == "hallway:#{hallways(:h1).id}" }
    assert_equal [100.0, 100.0, 'icon_top_left'], [hallway[:x], hallway[:y], hallway[:anchor]]
    assert_nil hallway[:floor], 'a hallway of the stacked level stands on every floor of it'
    h6 = json[:nodes].find { |n| n[:id] == "hallway:#{hallways(:h6).id}" }
    assert_equal 5, h6[:floor], 'on a single-floor level the floor is concrete'
    h1 = "hallway:#{hallways(:h1).id}"
    assert json[:edges].any? { |e| e[:from] == h1 || e[:to] == h1 }
    assert_equal 2, json[:vertical_connections].size
    lift = json[:nodes].select { |n| n[:id] == "elevator:#{elevators(:lift).id}" }
    assert_equal 2, lift.size, 'the lift serves both floorplates, so it is listed once per level'
    assert_equal ["hallway:#{hallways(:h2).id}", "hallway:#{hallways(:h6).id}"], lift.map { |n| n[:attach] }
    assert_equal 3, json[:tour][:stops].size
    refute_match(/access_code/, json.to_json)
  end
end
