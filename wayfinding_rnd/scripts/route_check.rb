# Builds the Tour App's routing graph for a property on the clone and tries routes between two units of a level.
community = Community.find(ENV.fetch('COMMUNITY').to_i)
graph = Wayfinding::GraphBuilder.new(community).build
puts "levels: #{graph.levels.map { |l| "#{l.key} space=#{l.space} w=#{l.width} h=#{l.height} floors=#{l.floors.inspect}" }.join(' | ')}"
hall = graph.nodes.values.select { |n| n.kind == 'hallway' }
units = graph.nodes.values.select { |n| n.kind == 'unit' }
puts "hallway nodes: #{hall.size}; unit nodes: #{units.size}; logical edges: #{graph.logical_edges.size}; warnings: #{graph.warnings.inspect}"
puts "stored hallways by space: #{Hallway.where(community_id: community.id).group(:space, :review_status).count.inspect}"
from = ENV['FROM']; to = ENV['TO']
if from && to
  result = Wayfinding::RouteService.new(community, from: from, to: to, step_free: false, avoid_blockers: true, graph: graph).call
  puts "route #{from} -> #{to}: ok=#{result.ok} #{result.respond_to?(:error) ? result.error.inspect : ''} #{result.respond_to?(:reason) ? result.reason.inspect : ''}"
  if result.ok
    legs = result.respond_to?(:legs) ? result.legs : nil
    puts "  legs: #{legs&.size} total_length=#{result.respond_to?(:total_length) ? result.total_length : '?'}"
    puts "  keys: #{result.to_h.keys.inspect}" if result.respond_to?(:to_h)
  else
    puts "  result: #{result.inspect[0, 600]}"
  end
end
if ENV['TOUR_API']
  built = TourApi::Engine.built(community)
  stop_ids = ENV['TOUR_STOPS'].to_s.split(',')
  begin
    out = TourApi::Routing.route(community, built, from: stop_ids[0], to: stop_ids[1], from_floor: nil, to_floor: nil, step_free: false, avoid_blockers: true)
    route = out[:route]
    puts "tour api route: success=#{out[:success]} keys=#{route.keys.inspect}"
    puts "  summary: #{route.reject { |k, _| %i[legs steps polyline points].include?(k) }.inspect[0, 500]}"
    legs = route[:legs] || []
    puts "  legs=#{legs.size} first leg keys=#{legs.first&.keys.inspect} points=#{(legs.first && (legs.first[:points] || legs.first[:polyline]))&.size}"
  rescue => e
    puts "tour api route error: #{e.class}: #{e.message[0, 300]}"
  end
end
if ENV['ROUTE_OUT'] && defined?(out) && out && out[:success]
  legs = out[:route][:legs] || []
  File.write(ENV['ROUTE_OUT'], JSON.pretty_generate(legs.map { |leg| { level: leg[:level], from: leg[:from], to: leg[:to], length_px: leg[:length_px], points: leg[:points] } }))
  puts "wrote #{ENV['ROUTE_OUT']}"
end
