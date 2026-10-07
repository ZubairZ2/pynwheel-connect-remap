require 'test_helper'

class Wayfinding::GraphSaveTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    @level = floorplates(:plate_a)
    @user = users(:super_admin)
    @h1 = hallways(:h1)
    @h2 = hallways(:h2)
    @h3 = hallways(:h3)
    @h4 = hallways(:h4)
  end

  # `save('nodes' => {...})` or `save({...}, origin: 'detect')`: string-keyed
  # parts arrive as keywords in Ruby 3, so both spellings are folded together.
  def save(payload = nil, level: @level, origin: 'edit', **parts)
    body = (payload || {}).merge(parts.transform_keys(&:to_s))
    base = { 'base_version' => level.reload.wayfinding_version, 'space' => 'raster', 'origin' => origin, 'request_id' => SecureRandom.uuid }
    Wayfinding::GraphSave.call(level: level, community: @community, user: @user, payload: base.merge(body))
  end

  test 'adds a node and an edge, mirrors the adjacency once and moves the version' do
    version = @level.wayfinding_version
    result = save('nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 700, 'y' => 100 }] },
                  'edges' => { 'add' => [{ 'a' => 'j:1', 'b' => @h4.id, 'kind' => 'manual' }] })
    node = Hallway.find(result.key_map['j:1'])
    assert_equal %w[manual confirmed raster], [node.source, node.review_status, node.space]
    assert_equal @user.id, node.created_by_user_id
    edge = HallwayEdge.for_pair(node.id, @h4.id).first
    assert edge.confirmed?
    lo, hi = [node, @h4].sort_by(&:id)
    assert_includes lo.reload.next_points, hi.id
    refute_includes hi.reload.next_points, lo.id
    assert_equal version + 1, result.version
    assert_equal 1, Hallway.on_level(@level).routable.where(selected: true).count
    assert PaperTrail::Version.where(item_type: 'Floorplate', item_id: @level.id, event: 'wayfinding_save').exists?
  end

  test 'a stale base_version is refused before anything is written' do
    assert_raises(Wayfinding::StaleVersion) do
      Wayfinding::GraphSave.call(level: @level, community: @community, user: @user,
                                 payload: { 'base_version' => @level.wayfinding_version + 5, 'nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 1, 'y' => 1 }] } })
    end
    assert_equal 4, Hallway.on_level(@level).count
  end

  test 'validation errors are collected and nothing is written' do
    error = assert_raises(Wayfinding::Invalid) do
      save('nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 10, 'y' => 10 }, { 'temp_key' => 'j:2', 'x' => 5000, 'y' => 10 }] },
           'edges' => { 'add' => [{ 'a' => 'j:1', 'b' => 'j:9' }] })
    end
    codes = error.errors.map { |e| e[:code] }
    assert_includes codes, 'out_of_bounds'
    assert_includes codes, 'unknown_node'
    assert_equal 4, Hallway.on_level(@level).count
  end

  test 'deleting an edge removes it from both sides and writes a tombstone' do
    save('edges' => { 'delete' => [{ 'a' => @h1.id, 'b' => @h2.id }] })
    refute_includes @h1.reload.next_points, @h2.id
    tomb = HallwaySuppression.on_level(@level).edges.last
    assert_equal [@h1.id, @h2.id].minmax, [tomb.hallway_a_id, tomb.hallway_b_id]
  end

  test 'deleting a node removes it from every next_points and writes a tombstone' do
    save('nodes' => { 'delete' => [@h2.id] })
    assert_nil Hallway.find_by(id: @h2.id)
    assert_equal [], @h1.reload.next_points
    tomb = HallwaySuppression.on_level(@level).nodes.last
    assert_in_delta 300.0, tomb.x1
    assert_equal 1, Hallway.on_level(@level).routable.where(selected: true).count
  end

  test 'detect merges onto nearby nodes, skips suppressed geometry and keeps new proposals pending' do
    save('nodes' => { 'delete' => [@h2.id] })
    result = save({ 'nodes' => { 'add' => [
                      { 'temp_key' => 'j:1', 'x' => 102, 'y' => 103, 'source' => 'inferred', 'confidence' => 0.8 },
                      { 'temp_key' => 'j:2', 'x' => 302, 'y' => 101, 'source' => 'inferred' },
                      { 'temp_key' => 'j:3', 'x' => 700, 'y' => 500, 'source' => 'inferred', 'confidence' => 0.6 }
                    ] },
                    'edges' => { 'add' => [{ 'a' => 'j:1', 'b' => 'j:2', 'kind' => 'inferred' }, { 'a' => 'j:1', 'b' => 'j:3', 'kind' => 'inferred' }] } },
                  origin: 'detect')
    assert_equal @h1.id, result.key_map['j:1']
    assert_nil result.key_map['j:2']
    fresh = Hallway.find(result.key_map['j:3'])
    assert fresh.pending?
    assert_equal 'inferred', fresh.source
    assert_equal result.run.id, fresh.detection_run_id
    edge = HallwayEdge.for_pair(@h1.id, fresh.id).first
    assert edge.pending?
    refute_includes @h1.reload.next_points, fresh.id
    assert_includes Hallway.on_level(@level).routable.pluck(:id), @h1.id
    refute_includes Hallway.on_level(@level).routable.pluck(:id), fresh.id
    assert_equal %w[merged suppressed endpoint_skipped], result.skipped.map { |s| s['reason'] }.first(3)
  end

  test 'a detect run is replayed by request id and never applied twice' do
    payload = { 'request_id' => 'run-1', 'nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 700, 'y' => 500 }] } }
    first = save(payload, origin: 'detect')
    count = Hallway.on_level(@level).count
    second = save(payload.merge('base_version' => 0), origin: 'detect')
    assert second.replayed
    assert_equal first.key_map, second.key_map
    assert_equal count, Hallway.on_level(@level).count
  end

  test 'a second detect run with the same proposals adds nothing' do
    proposals = { 'nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 700, 'y' => 500 }, { 'temp_key' => 'j:2', 'x' => 800, 'y' => 500 }] },
                  'edges' => { 'add' => [{ 'a' => 'j:1', 'b' => 'j:2' }] } }
    save(proposals, origin: 'detect')
    nodes = Hallway.on_level(@level).count
    edges = HallwayEdge.on_level(@level).count
    second = save(proposals, origin: 'detect')
    assert_equal nodes, Hallway.on_level(@level).count
    assert_equal edges, HallwayEdge.on_level(@level).count
    assert_equal 2, second.counts[:nodes_merged]
  end

  test 'detect may only add' do
    error = assert_raises(Wayfinding::Invalid) { save({ 'nodes' => { 'delete' => [@h1.id] } }, origin: 'detect') }
    assert_equal ['detect_may_only_add'], error.errors.map { |e| e[:code] }.uniq
  end

  test 'moving a pending node confirms it and mirrors its edges' do
    result = save({ 'nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 700, 'y' => 500 }] },
                    'edges' => { 'add' => [{ 'a' => 'j:1', 'b' => @h4.id }] } }, origin: 'detect')
    node = Hallway.find(result.key_map['j:1'])
    save('nodes' => { 'move' => [{ 'id' => node.id, 'x' => 710, 'y' => 505 }] })
    node.reload
    assert node.confirmed?
    assert node.confirmed_at.present?
    assert HallwayEdge.for_pair(node.id, @h4.id).first.confirmed?
    lo, hi = [node, @h4].sort_by(&:id)
    assert_includes lo.reload.next_points, hi.id
  end

  test 'a hand re-creation at a suppressed geometry clears the tombstone' do
    save('nodes' => { 'delete' => [@h2.id] })
    assert_equal 1, HallwaySuppression.on_level(@level).nodes.count
    save('nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 300, 'y' => 100 }] })
    assert_equal 0, HallwaySuppression.on_level(@level).nodes.count
  end

  test 'links are set, detached and cleared' do
    unit = units(:plotted_unit)
    save('links' => { 'set' => [{ 'attachable_type' => 'Unit', 'attachable_id' => unit.id, 'hallway' => @h3.id }] })
    att = HallwayAttachment.on_level(@level).find_by(attachable: unit)
    assert_equal [@h3.id, 'explicit'], [att.hallway_id, att.mode]
    save('links' => { 'detach' => [{ 'attachable_type' => 'Unit', 'attachable_id' => unit.id }] })
    assert_equal ['detached', nil], [att.reload.mode, att.hallway_id]
    save('links' => { 'clear' => [{ 'attachable_type' => 'Unit', 'attachable_id' => unit.id }] })
    assert_nil HallwayAttachment.find_by(id: att.id)
  end

  test 'a link to a record of another property is refused' do
    error = assert_raises(Wayfinding::Invalid) { save('links' => { 'set' => [{ 'attachable_type' => 'Unit', 'attachable_id' => units(:no_tour_unit).id, 'hallway' => @h1.id }] }) }
    assert_equal 'unknown_attachable', error.errors.first[:code]
  end

  test 'plotting a unit writes the legacy columns and the typed tour stop copy' do
    unit = units(:unplotted_unit)
    other = TourStop.create!(tour: tours(:main_tour), stop_type: 'elevator', stop_id: unit.id, name: 'same id', latitude: 1, longitude: 1)
    stop = TourStop.create!(tour: tours(:main_tour), stop_type: 'unit', stop_id: unit.id, name: '102')
    save('pins' => { 'units' => [{ 'id' => unit.id, 'x' => 640, 'y' => 410 }] })
    unit.reload
    assert_equal [640, 410, @level.id], [unit.x_plot, unit.y_plot, unit.floorplate_id]
    assert_equal [640, 410], [stop.reload.latitude.to_i, stop.longitude.to_i]
    assert_equal [1, 1], [other.reload.latitude.to_i, other.longitude.to_i]
  end

  test 'unplotting a unit removes its tour stop as the legacy page does and keeps the unit' do
    unit = units(:plotted_unit)
    stop_id = tour_stops(:unit_stop).id
    save('pins' => { 'units' => [{ 'id' => unit.id, 'unplot' => true }] })
    unit.reload
    assert_equal [0, 0, nil], [unit.x_plot, unit.y_plot, unit.floorplate_id]
    assert_nil TourStop.find_by(id: stop_id)
    assert Unit.exists?(unit.id)
  end

  test 'elevator and tour-start pins move the legacy records' do
    lift = elevators(:lift)
    save('pins' => { 'elevators' => [{ 'id' => lift.id, 'x' => 310, 'y' => 95 }], 'tour_start' => { 'x' => 44, 'y' => 48 } })
    assert_equal [310, 95], [lift.reload.x_plot, lift.y_plot]
    assert_equal [310, 95], [tour_stops(:lift_stop).reload.latitude.to_i, tour_stops(:lift_stop).longitude.to_i]
    assert_equal [44, 48], [tours(:main_tour).reload.x_plot, tours(:main_tour).y_plot]
  end

  test 'additional stops are created in the record their kind belongs to' do
    result = save('stops' => { 'create' => [
                    { 'temp_key' => 'n:1', 'kind' => 'restroom', 'name' => 'Lobby restroom', 'x' => 640, 'y' => 410, 'floor' => 1, 'note' => 'Past the mailroom' },
                    { 'temp_key' => 'n:2', 'kind' => 'elevator', 'name' => 'Service lift', 'x' => 600, 'y' => 100, 'floors' => 'Lobby-3' },
                    { 'temp_key' => 'n:3', 'kind' => 'stairs', 'name' => 'South stairs', 'x' => 620, 'y' => 100, 'floors' => '1, 2, 3' },
                    { 'temp_key' => 'n:4', 'kind' => 'door', 'name' => 'Side gate', 'x' => 10, 'y' => 300, 'lock_provider' => 'Manual' },
                    { 'temp_key' => 'n:5', 'kind' => 'blocker', 'name' => 'Wet floor', 'x' => 308, 'y' => 200, 'radius_px' => 40 },
                    { 'temp_key' => 'n:6', 'kind' => 'entry', 'name' => 'Second entry', 'x' => 900, 'y' => 500 }
                  ] })
    restroom = WayfindingStop.find(result.key_map['n:1'].split(':').last)
    assert_equal ['restroom', 1, 640.0, 'Past the mailroom'], [restroom.kind, restroom.floor, restroom.x_plot, restroom.note]
    lift = Elevator.find(result.key_map['n:2'].split(':').last)
    assert_equal ['elevator', '1-3', @level.id], [lift.kind, lift.floorplate_covering_range, lift.floorplate_id]
    assert TourStop.where(stop_type: 'elevator', stop_id: lift.id, tour_id: tours(:main_tour).id).exists?
    stairs = Elevator.find(result.key_map['n:3'].split(':').last)
    assert_equal ['stairs', '1-3', false], [stairs.kind, stairs.floorplate_covering_range, stairs.accessible]
    assert_not TourStop.where(stop_type: 'elevator', stop_id: stairs.id).exists?
    door = Door.find(result.key_map['n:4'].split(':').last)
    assert_equal ['Floorplate', @level.id, 'Side gate', true], [door.attached_with_type, door.attached_with_id, door.name, door.name_overrided]
    assert_equal 40.0, WayfindingStop.find(result.key_map['n:5'].split(':').last).radius_px
    # building A already has an entry gate, so the second entry is a wayfinding stop
    assert result.key_map['n:6'].start_with?('stop:')
  end

  test 'invalid stop fields are refused as a whole' do
    error = assert_raises(Wayfinding::Invalid) do
      save('stops' => { 'create' => [{ 'temp_key' => 'n:1', 'kind' => 'elevator', 'name' => 'x', 'floors' => 'penthouse' }, { 'temp_key' => 'n:2', 'kind' => 'restroom', 'name' => '' }] })
    end
    assert_equal %w[invalid_floors required], error.errors.map { |e| e[:code] }
    assert_equal 2, Elevator.where(community_id: @community.id).count
  end

  test 'a failure after writes rolls everything back' do
    Hallway.stub(:create!, ->(*) { raise 'boom' }) do
      assert_raises(RuntimeError) do
        save('edges' => { 'delete' => [{ 'a' => @h1.id, 'b' => @h2.id }] }, 'nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 1, 'y' => 1 }] })
      end
    end
    assert_includes @h1.reload.next_points, @h2.id
    assert_equal 0, HallwaySuppression.on_level(@level).count
  end

  test 'a node of another level cannot be addressed' do
    error = assert_raises(Wayfinding::Invalid) { save('nodes' => { 'move' => [{ 'id' => hallways(:h5).id, 'x' => 1, 'y' => 1 }] }) }
    assert_equal 'unknown_node', error.errors.first[:code]
  end

  test 'svg-space nodes are stored but stay invisible to legacy readers' do
    result = save('space' => 'svg', 'nodes' => { 'add' => [{ 'temp_key' => 'j:1', 'x' => 1200.5, 'y' => 900.25 }] })
    node = Hallway.find(result.key_map['j:1'])
    assert_equal 'svg', node.space
    refute_includes Hallway.on_level(@level).routable, node
  end
end
