require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

class Api::TourApp::V1::MapsTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  setup do
    build_tour_app_fixtures!
    @token = api_token_for(users(:super_admin))
    # plate_b has a floor SVG; plate_c is an SVG-only plate (no raster frame) whose file is not valid SVG.
    @plate_b.update_columns(svg_image: 'b.svg')
    @plate_c.update_columns(svg_image: 'bad.svg', width: 0, height: 0, svg_metadata: { 'width' => 2000, 'height' => 2000 })
    reset_tour_api_caches!
    TourApi::Assets.http = lambda do |url|
      if url.end_with?('/b.svg') then [200, SVG]
      elsif url.end_with?('/bad.svg') then [200, "PNG\x89 not an svg".b]
      else [404, nil]
      end
    end
  end

  teardown { reset_tour_api_caches! }

  test 'the map: levels, buildings and the per-level SVG facts' do
    with_s3_uploads { get "#{@base}/map", headers: auth }
    assert_response :success, response.body
    assert_equal %w[success property_id graph_version is_sitemap auto_wayfinding scale buildings levels], body.keys
    assert_equal TourApi::Engine.version(@community), body['graph_version']
    assert_equal({ 'unit' => 'px', 'ft_per_px' => nil }, body['scale'])
    assert_equal [@level_a, @level_c, @level_b], body['levels'].map { |l| l['id'] }, 'levels sort by lowest floor, then id'
    first = body['levels'][0]
    assert_equal TourApi::Shapes::LEVEL_KEYS.map(&:to_s), first.keys
    assert_equal [[1, 2, 3], 'A', 'raster', 'Tower A'], [first['floors'], first['building'], first['space'], first['name']]
    assert_equal [1000, 600], [first['width'], first['height']]
    assert_nil first['image']
    assert_nil first['svg']
    assert_nil first['svg_path']
    assert_nil first['svg_transform']
    assert_equal @plate_a.reload.wayfinding_version, first['version']
    by_id = body['levels'].index_by { |l| l['id'] }
    assert_equal "https://bucket.s3-accelerate.amazonaws.com/uploads/floorplate/svg_image/#{@plate_b.id}/b.svg", by_id[@level_b]['svg']
    assert_equal "#{@base}/map/levels/#{@level_b}/svg", by_id[@level_b]['svg_path']
    assert_equal({ 'width' => 2000, 'height' => 2000 }, by_id[@level_c]['svg_size'])
    assert_nil by_id[@level_c]['width'], 'an SVG-only plate has no raster frame; the app uses the viewBox'
    assert_equal [{ 'name' => 'A', 'level_ids' => [@level_a, @level_b] }, { 'name' => 'B', 'level_ids' => [@level_c] }], body['buildings']
  end

  test 'a calibrated transform is carried when stored' do
    @plate_b.update_columns(svg_to_image_transform: { 'a' => 0.5, 'b' => 0, 'c' => 0, 'd' => 0.5, 'e' => 0, 'f' => 0, 'method' => 'aspect' })
    reset_tour_api_caches!
    with_s3_uploads { get "#{@base}/map", headers: auth }
    level = body['levels'].find { |l| l['id'] == @level_b }
    assert_equal({ 'a' => 0.5, 'b' => 0, 'c' => 0, 'd' => 0.5, 'e' => 0, 'f' => 0, 'method' => 'aspect' }, level['svg_transform'])
    @plate_b.update_columns(svg_to_image_transform: { 'a' => 'x' })
    reset_tour_api_caches!
    with_s3_uploads { get "#{@base}/map", headers: auth }
    assert_nil body['levels'].find { |l| l['id'] == @level_b }['svg_transform'], 'a malformed transform is not carried'
  end

  test 'one level with its nodes and paths' do
    with_s3_uploads { get "#{@base}/map/levels/#{@level_b}", headers: auth }
    assert_response :success, response.body
    assert_equal @level_b, body['level']['id']
    assert_equal "#{@base}/map/levels/#{@level_b}/svg", body['level']['svg_path']
    assert body['nodes'].all? { |n| n['level'] == @level_b }
    assert_equal %w[elevator hallway hallway], body['nodes'].map { |n| n['kind'] }.sort
    assert body['nodes'].all? { |n| n.keys == TourApi::Shapes::NODE_KEYS.map(&:to_s) }
    assert_equal 1, body['edges'].size
    assert body['edges'].all? { |e| e['level'] == @level_b }
    with_s3_uploads { get "#{@base}/map/levels/floorplate:77", headers: auth }
    assert_response :not_found
    assert_equal 'unknown_level', body['error']['code']
  end

  test 'the graph payload, every field present, with its ETag' do
    with_s3_uploads { get "#{@base}/graph", headers: auth }
    assert_response :success, response.body
    version = TourApi::Engine.version(@community)
    assert_equal %("#{version}"), response.headers['ETag']
    assert_equal %w[success version community_id is_sitemap auto_wayfinding scale levels buildings nodes edges vertical_connections gates tour], body.keys
    assert_equal [version, @community.id], [body['version'], body['community_id']]
    assert body['nodes'].all? { |n| n.keys == TourApi::Shapes::NODE_KEYS.map(&:to_s) }, 'every node carries every field (null when it does not apply)'
    assert body['levels'].all? { |l| l.keys == TourApi::Shapes::LEVEL_KEYS.map(&:to_s) }
    assert body['levels'].all? { |l| l['svg_path'].nil? }, 'the graph serves the plain level shape; svg_path is a map fact'
    nodes = body['nodes'].index_by { |n| [n['id'], n['level']] }
    unit = nodes[[@u101, @level_a]]
    assert_equal ['door', "hallway:#{hallways(:h2).id}", 'nearest', 1], [unit['anchor'], unit['attach'], unit['link'], unit['floor']]
    assert_nil unit['review']
    hallway = nodes[["hallway:#{hallways(:h1).id}", @level_a]]
    assert_equal ['icon_top_left', 100.0, 'confirmed'], [hallway['anchor'], hallway['x'], hallway['review']]
    assert_nil hallway['floor'], 'a hallway of the stacked level stands on every floor of it'
    assert_nil hallway['attach']
    lift_levels = body['nodes'].select { |n| n['id'] == "elevator:#{@lift.id}" }.map { |n| n['level'] }.sort
    assert_equal [@level_a, @level_b].sort, lift_levels, 'the lift serves both plates, once per level'
    assert_equal [1, 2, 3, 4, 5], nodes[["elevator:#{@lift.id}", @level_a]]['floors_served']
    assert_equal 'stairs', nodes[["elevator:#{@stairs.id}", @level_a]]['vertical']
    assert_equal({ "elevator:#{@lift.id}" => 'elevator', "elevator:#{@stairs.id}" => 'stairs' }, body['vertical_connections'].to_h { |v| [v['id'], v['kind']] })
    assert_equal ["bsp:#{building_starting_points(:entry_a).id}", "bsp:#{@gate_b.id}", @start].sort, body['gates'].map { |g| g['id'] }.sort
    assert_equal @start, body['tour']['start']
    assert_equal 9, body['tour']['stops'].size
    assert_equal %w[tour_stop_id node stop_type name sort visible duration_minutes on_map], body['tour']['stops'][0].keys
    h1 = "hallway:#{hallways(:h1).id}"
    h2 = "hallway:#{hallways(:h2).id}"
    edge = body['edges'].find { |e| [e['from'], e['to']].sort == [h1, h2].sort }
    assert edge, 'the h1-h2 path is an edge'
    assert_equal [[108.0, 108.0], [308.0, 108.0]].sort, edge['polyline'].sort, 'centre pixels along the path (the lower id first)'
    assert_equal [@level_a, 'walk', 'manual', 200.0], [edge['level'], edge['kind'], edge['path_kind'], edge['length_px']]
    refute_match(/access_code/, response.body)
    with_s3_uploads { get "#{@base}/graph", headers: auth.merge('If-None-Match' => %("#{version}")) }
    assert_response :not_modified
    with_s3_uploads { get "#{@base}/graph", headers: auth.merge('If-None-Match' => '"wf-stale"') }
    assert_response :success
  end

  test 'the floor SVG is served validated and cached, with an ETag and its viewBox' do
    with_s3_uploads { get "#{@base}/map/levels/#{@level_b}/svg", headers: auth }
    assert_response :success, response.body
    assert response.headers['Content-Type'].start_with?('image/svg+xml')
    etag = response.headers['ETag']
    assert_equal %("#{Digest::SHA1.hexdigest(SVG)[0, 20]}"), etag
    assert_equal '0 0 1412 912', response.headers['X-Svg-ViewBox']
    assert_equal 'private, max-age=86400', response.headers['Cache-Control']
    assert response.body.start_with?('<?xml')
    assert_includes response.body, '<svg'
    TourApi::Assets.http = ->(_url) { raise 'the second read must come from the cache' }
    with_s3_uploads { get "#{@base}/map/levels/#{@level_b}/svg", headers: auth.merge('If-None-Match' => etag) }
    assert_response :not_modified
    assert_equal etag, response.headers['ETag']
  end

  test 'SVG errors: no file, an invalid file, an unknown level, no token' do
    with_s3_uploads { get "#{@base}/map/levels/#{@level_a}/svg", headers: auth }
    assert_response :not_found
    assert_equal 'no_svg', body['error']['code']
    with_s3_uploads { get "#{@base}/map/levels/#{@level_c}/svg", headers: auth }
    assert_response :unprocessable_entity
    assert_equal 'invalid_svg', body['error']['code']
    with_s3_uploads { get "#{@base}/map/levels/floorplate:99/svg", headers: auth }
    assert_response :not_found
    assert_equal 'unknown_level', body['error']['code']
    get "#{@base}/map/levels/#{@level_b}/svg"
    assert_response :unauthorized
    TourApi::Assets.http = ->(_url) { [403, 'denied'] }
    @plate_a.update_columns(svg_image: 'missing.svg')
    reset_tour_api_caches!
    with_s3_uploads { get "#{@base}/map/levels/#{@level_a}/svg", headers: auth }
    assert_response :bad_gateway
    assert_equal 'svg_unavailable', body['error']['code']
  end

  test 'instructions are plain text everywhere' do
    with_s3_uploads { get "#{@base}/stops", headers: auth }
    gym = all_stops(body).find { |s| s['id'] == @gym_key }
    assert_equal 'Past the mailroom.', gym['instruction']
    with_s3_uploads { post_json("#{@base}/route", { from_stop_id: @start, to_stop_id: @gym_key }) }
    assert_equal 'Past the mailroom.', body['route']['steps'][-1]['instruction']
    @lift.update_columns(directional_text: 'Lobby,&nbsp;<b>left</b><br>of the desk')
    reset_tour_api_caches!
    with_s3_uploads { post_json("#{@base}/route", { from_stop_id: @u101, to_stop_id: @u301 }) }
    assert_equal 'Lobby, left of the desk', body['route']['steps'][1]['instruction']
    assert_equal 'Lobby,&nbsp;<b>left</b><br>of the desk', body['route']['steps'][1]['transition'] && @lift.reload.directional_text, 'the CMS text itself is untouched'
  end
end
