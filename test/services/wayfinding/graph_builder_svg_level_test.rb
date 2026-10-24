require 'test_helper'

# A floorplate with a floor SVG and no floor image (a Beans SVG-only floor) routes
# on the rows Connect saves in the SVG's own units: `space: 'svg'`, the viewBox as
# the frame, pointer-placed units standing where their link anchors them.
class Wayfinding::GraphBuilderSvgLevelTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    @plate = Floorplate.new(name: 'Floor 7', number: 7, range: '7', community: @community)
    @plate.save!(validate: false)
    @plate.update_columns(svg_image: '1790024432-Floor_7_noBG.svg', image: nil, svg_metadata: { 'width' => 1412, 'height' => 932 })
    @a = Hallway.create!(parent: @plate, community_id: @community.id, x_plot: 100, y_plot: 100, space: 'svg', source: 'vector', review_status: 'confirmed', next_points: [], selected: false)
    @b = Hallway.create!(parent: @plate, community_id: @community.id, x_plot: 300, y_plot: 100, space: 'svg', source: 'vector', review_status: 'confirmed', next_points: [], selected: false)
    @a.update_columns(next_points: [@b.id])
    HallwayEdge.create!(from_hallway: @a, to_hallway: @b, parent: @plate, community_id: @community.id, kind: 'traced', path_points: [[200, 120]], review_status: 'confirmed', space: 'svg')
    @unit = Unit.create!(community: @community, marketing_name: '701', provider_unit_id: 'u701', floor: 7, building: 'A', visible: true, available: true, modal_unit: false,
                         x_plot: 0, y_plot: 0, pointer_data: { 'id' => 'Vector_7', 'tag' => 'polygon', 'x_plot' => '110', 'y_plot' => '140', 'selector' => '' })
    HallwayAttachment.create!(attachable: @unit, parent: @plate, community_id: @community.id, mode: 'explicit', hallway: @a, anchor_x: 110, anchor_y: 140, space: 'svg')
  end

  test 'an image-less floorplate is an SVG-framed level whose rows are read in SVG space' do
    graph = Wayfinding::GraphBuilder.new(@community).build
    level = graph.level("floorplate:#{@plate.id}")
    assert_equal 'svg', level.space
    assert_equal [1412.0, 932.0], [level.width, level.height]
    assert_equal 'raster', graph.level("floorplate:#{floorplates(:plate_a).id}").space, 'image levels keep the raster frame'

    a = graph.nodes["hallway:#{@a.id}"]
    assert_equal [100.0, 100.0], [a.x, a.y], 'an SVG row is the point itself, no icon offset'
    edge = graph.logical_edges.find { |e| e[:level_key] == level.key }
    assert_equal [[100.0, 100.0], [200.0, 120.0], [300.0, 100.0]], edge[:polyline]
  end

  test 'a pointer-placed unit stands at its link anchor and routes along the SVG network' do
    graph = Wayfinding::GraphBuilder.new(@community).build
    unit = graph.nodes["unit:#{@unit.id}"]
    assert unit, 'the unit with x/y 0 and no floorplate_id is on the level that covers its floor'
    assert_equal [110.0, 140.0], [unit.x, unit.y]
    assert_equal ["hallway:#{@a.id}", 'explicit'], [unit.attach, unit.link]

    result = Wayfinding::RouteService.new(@community, from: "unit:#{@unit.id}", to: "hallway:#{@b.id}", graph: graph).call
    assert result.ok, result.error.inspect
    assert_equal 1, result.legs.size
    points = result.legs.first.points
    assert_equal [110.0, 140.0], points.first.map(&:to_f)
    assert_includes points.map { |p| p.map(&:to_f) }, [200.0, 120.0], 'the stored polyline is walked'
    assert_in_delta Math.hypot(10, 40) + Math.hypot(100, 20) * 2, result.length_px, 1.0
  end

  test 'a raster-space row on an SVG-framed level, and an SVG-space row on an image level, are not routed' do
    stray = Hallway.create!(parent: @plate, community_id: @community.id, x_plot: 5, y_plot: 5, space: 'raster', source: 'manual', review_status: 'confirmed', next_points: [], selected: false)
    svg_on_image = Hallway.create!(parent: floorplates(:plate_a), community_id: @community.id, x_plot: 5, y_plot: 5, space: 'svg', source: 'vector', review_status: 'confirmed', next_points: [], selected: false)
    graph = Wayfinding::GraphBuilder.new(@community).build
    assert_nil graph.nodes["hallway:#{stray.id}"]
    assert_nil graph.nodes["hallway:#{svg_on_image.id}"]
  end
end
