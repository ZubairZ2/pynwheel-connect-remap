# New-backend (B2) writes against the shared schema, run with the NEW code:
#   bundle exec rails runner b2_writes.rb OUT.json
# Writes through the real services (what the Connect endpoints call), commits,
# and records every created row so the legacy harness can be checked against them.
require 'json'
OUT = ARGV[0] || 'b2_writes.json'
user = User.find_by!(email: 'salahudin@pynwheel.com')
R = { started: Time.now.utc.iso8601, code: `git rev-parse --short HEAD`.strip, communities: {} }

def counts(cid)
  fps = Floorplate.where(community_id: cid).pluck(:id)
  { hallways: Hallway.where(parent_type: 'Floorplate', parent_id: fps).count, hallways_pending: Hallway.where(parent_type: 'Floorplate', parent_id: fps).pending.count,
    hallways_svg: Hallway.where(parent_type: 'Floorplate', parent_id: fps, space: 'svg').count,
    hallway_edges: HallwayEdge.where(parent_type: 'Floorplate', parent_id: fps).count, attachments: HallwayAttachment.where(community_id: cid).count,
    suppressions: HallwaySuppression.where(community_id: cid).count, wayfinding_stops: WayfindingStop.where(community_id: cid).count,
    elevators: Elevator.where(community_id: cid).count, elevators_stairs: Elevator.where(community_id: cid, kind: 'stairs').count,
    tour_stops: TourStop.joins(:tour).where(tours: { community_id: cid }).count, units: Unit.where(community_id: cid).count,
    doors: Door.where(community_id: cid).count, versions: PaperTrail::Version.where(community_id: cid).count }
end

[1411, 1618].each do |cid|
  c = Community.find(cid)
  level = c.floorplates.joins(:hallways).group('floorplates.id').order(Arel.sql('count(hallways.id) desc')).first
  out = { level_id: level.id, before: counts(cid), steps: [] }
  base = -> { { 'base_version' => level.reload.wayfinding_version, 'space' => 'raster', 'origin' => 'edit', 'request_id' => SecureRandom.uuid } }
  existing = level.hallways.routable.order(:id).to_a
  anchor = existing[existing.size / 2]
  # 1. edit: two confirmed nodes, bridged to an existing node (mirrors into next_points)
  r = Wayfinding::GraphSave.call(level: level, community: c, user: user, payload: base.call.merge(
    'nodes' => { 'add' => [{ 'temp_key' => 'c:1', 'x' => 150, 'y' => 150 }, { 'temp_key' => 'c:2', 'x' => 250, 'y' => 150 }] },
    'edges' => { 'add' => [{ 'a' => 'c:1', 'b' => 'c:2', 'kind' => 'manual', 'points' => [[200, 120]] }, { 'a' => 'c:2', 'b' => anchor.id, 'kind' => 'bridge' }] }))
  out[:steps] << { step: 'edit_confirmed', key_map: r.key_map, counts: r.counts, version: level.reload.wayfinding_version, anchor_id: anchor.id, anchor_next_points: anchor.reload.next_points }
  conf_ids = r.key_map.values.map { |v| v.to_s.split(':').last.to_i }
  # 2. detect: two pending nodes + inferred edge (never mirrored into next_points)
  r = Wayfinding::GraphSave.call(level: level, community: c, user: user, payload: base.call.merge('origin' => 'detect', 'detector_source' => 'inferred', 'scope' => 'plate',
    'nodes' => { 'add' => [{ 'temp_key' => 'p:1', 'x' => 150, 'y' => 350 }, { 'temp_key' => 'p:2', 'x' => 250, 'y' => 350 }] },
    'edges' => { 'add' => [{ 'a' => 'p:1', 'b' => 'p:2', 'kind' => 'inferred' }, { 'a' => 'p:2', 'b' => anchor.id, 'kind' => 'inferred' }] }))
  pend_ids = r.key_map.values.map { |v| v.to_s.split(':').last.to_i }
  out[:steps] << { step: 'detect_pending', key_map: r.key_map, counts: r.counts, run_id: r.run&.id, pending_rows: Hallway.where(id: pend_ids).map { |h| h.attributes.slice('id', 'x_plot', 'y_plot', 'next_points', 'review_status', 'source', 'space', 'selected') }, anchor_next_points: anchor.reload.next_points }
  # 3. svg-space node
  r = Wayfinding::GraphSave.call(level: level, community: c, user: user, payload: base.call.merge('space' => 'svg', 'nodes' => { 'add' => [{ 'temp_key' => 's:1', 'x' => 1200.5, 'y' => 900.25 }] }))
  svg_ids = r.key_map.values.map { |v| v.to_s.split(':').last.to_i }
  out[:steps] << { step: 'svg_node', key_map: r.key_map, rows: Hallway.where(id: svg_ids).map { |h| h.attributes.slice('id', 'x_plot', 'y_plot', 'space', 'review_status') } }
  # 4. additional stops: stairs (legacy table, no tour stop), elevator (legacy table + tour stop), restroom (new table), blocker
  floors = level.floors
  r = Wayfinding::GraphSave.call(level: level, community: c, user: user, payload: base.call.merge('stops' => { 'create' => [
    { 'temp_key' => 'n:1', 'kind' => 'stairs', 'name' => 'Audit stairs', 'x' => 620, 'y' => 100, 'floors' => "#{floors.min}-#{floors.max}" },
    { 'temp_key' => 'n:2', 'kind' => 'elevator', 'name' => 'Audit lift', 'x' => 600, 'y' => 100, 'floors' => "#{floors.min}-#{floors.max}" },
    { 'temp_key' => 'n:3', 'kind' => 'restroom', 'name' => 'Audit restroom', 'x' => 640, 'y' => 410, 'floor' => floors.first, 'note' => 'audit' },
    { 'temp_key' => 'n:4', 'kind' => 'blocker', 'name' => 'Audit blocker', 'x' => 308, 'y' => 200, 'radius_px' => 40 } ] }))
  out[:steps] << { step: 'stops_create', key_map: r.key_map, counts: r.counts,
                   elevators: Elevator.where(community_id: cid).where('name like ?', 'Audit%').map { |e| e.attributes.slice('id', 'name', 'kind', 'accessible', 'x_plot', 'y_plot', 'floorplate_covering_range', 'floorplate_id', 'building') },
                   elevator_tour_stops: TourStop.where(stop_type: 'elevator', stop_id: Elevator.where(community_id: cid).where('name like ?', 'Audit%').pluck(:id)).map { |t| t.attributes.slice('id', 'tour_id', 'stop_id', 'name', 'display_stop') } }
  # 5. Show in Stops List ON for a unit that is not a stop, and for an amenity
  unit = c.units.where.not(id: TourStop.joins(:tour).where(tours: { community_id: cid }, stop_type: 'unit').select(:stop_id)).where.not(x_plot: [nil, 0]).first || c.units.first
  st = TourStops::Membership.set!(community: c, user: user, stop_type: 'unit', stop_id: unit.id, show: true)
  out[:steps] << { step: 'stop_list_unit_on', unit_id: unit.id, changed: st.changed, tour_stop: st.tour_stop&.attributes&.slice('id', 'tour_id', 'stop_type', 'stop_id', 'name', 'sort', 'display_stop', 'latitude', 'longitude', 'duration_minutes') }
  if (am = c.amenities.first)
    st = TourStops::Membership.set!(community: c, user: user, stop_type: 'amenity', stop_id: am.id, show: true)
    out[:steps] << { step: 'stop_list_amenity_on', amenity_id: am.id, changed: st.changed, tour_stop: st.tour_stop&.attributes&.slice('id', 'tour_id', 'stop_type', 'stop_id', 'display_stop'), breezway_lock_visible: am.reload.breezway_lock_visible }
  end
  # 6. Tour Setup save: reorder + duration on the main tour
  tour = c.community_tour
  stops = tour.tour_stops.order(:sort, :id).to_a
  r = TourSetup::Save.call(community: c, user: user, payload: { 'base_version' => tour.reload.tour_setup_version, 'stops' => { 'order' => stops.reverse.map(&:id), 'duration' => [{ 'id' => stops.first.id, 'duration_minutes' => 7 }] } }) rescue out[:steps] << { step: 'tour_setup_save', error: [$!.class.name, $!.message[0, 300], ($!.respond_to?(:errors) ? $!.errors : nil)] }
  out[:steps] << { step: 'tour_setup_save', counts: (r.counts rescue nil), version: tour.reload.tour_setup_version, first_stop: TourStop.find(stops.first.id).attributes.slice('id', 'sort', 'duration_minutes') } if r.is_a?(TourSetup::Save::Result) || (r.respond_to?(:counts))
  out[:after] = counts(cid)
  out[:created] = { confirmed_hallways: conf_ids, pending_hallways: pend_ids, svg_hallways: svg_ids }
  R[:communities][cid] = out
  $stderr.puts "#{cid}: #{out[:before]} -> #{out[:after]}"
end
File.write(OUT, JSON.pretty_generate(R))
