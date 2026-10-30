# New code: does the Tour App graph (GraphBuilder) and its version see a hallway id given in ARGV?
require 'json'
cid, hid, level_id = ARGV[0].to_i, ARGV[1].to_i, ARGV[2].to_i
c = Community.find(cid)
g = Wayfinding::GraphBuilder.new(c).build
node_ids = []
json = Wayfinding::GraphSerializer.new(g, version: 'x', base_url: 'http://x').as_json
ids_in_json = JSON.generate(json).scan(/hallway:(\d+)/).flatten.map(&:to_i).uniq
level = Floorplate.find(level_id)
connect_rows = Connect::WayfindingLevelSerializer.new(level, community: c).as_json[:hallways].map { |h| h[:id] }
puts JSON.generate(hallway_id: hid, in_graph_builder_json: ids_in_json.include?(hid), graph_hallway_count: ids_in_json.size,
                   db_routable_on_level: Hallway.on_level(level).routable.count, builder_rows_on_level: Hallway.where(community_id: cid, space: 'raster', parent_type: 'Floorplate', parent_id: level_id).count,
                   in_connect_level_serializer: connect_rows.include?(hid), graph_version: Wayfinding::GraphVersion.for(c),
                   null_cid_rows_on_level: Hallway.on_level(level).where(community_id: nil).count)
