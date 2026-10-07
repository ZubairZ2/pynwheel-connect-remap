#!/usr/bin/env ruby
# frozen_string_literal: true

# Parity harness for the Tour App API: two deployments answer the same JSON.
#
# Written for the October 2026 port of the API from FastAPI (`tour-api/`, paths
# /api/v1) to Rails (Api::TourApp::V1, paths /api/tour/v1); it compares any two
# bases, endpoint by endpoint, for the given properties:
#
#   EMAIL=... PASSWORD=... ruby script/tour_api_parity.rb \
#     --a http://127.0.0.1:8000 --prefix-a /api/v1 \
#     --b http://127.0.0.1:3100 --prefix-b /api/tour/v1  1411 1618 2934
#
# Endpoints: login, me, properties (and ?tour_enabled=true), properties/{id},
# stops, map, map/levels/{first level}, graph (+ETag/304), the first SVG level's
# headers, route (tour start → the first routable stop), tour-route (the
# routable stops, up to six), stops/distances (every stop), plus the error
# envelopes (unknown property, invalid stop, unknown endpoint, bad token).
#
# Normalised before comparing: access_token / expires_at (per sign-in), the
# graph version / ETag (each runtime hashes it in its own format; the script
# reports both), and the API prefix inside `svg_path`. Numbers compare with a
# 0.011 tolerance (rounding). Exit status 1 on any other difference.
require 'json'
require 'net/http'
require 'optparse'
require 'uri'

options = { a: 'http://127.0.0.1:8000', prefix_a: '/api/v1', b: 'http://127.0.0.1:3100', prefix_b: '/api/tour/v1', pairs: 6 }
OptionParser.new do |o|
  o.on('--a URL') { |v| options[:a] = v }
  o.on('--prefix-a PATH') { |v| options[:prefix_a] = v }
  o.on('--b URL') { |v| options[:b] = v }
  o.on('--prefix-b PATH') { |v| options[:prefix_b] = v }
  o.on('--stops N', Integer) { |v| options[:pairs] = v }
end.parse!
ids = ARGV.map(&:to_i)
ids = [1411] if ids.empty?
email = ENV.fetch('EMAIL')
password = ENV.fetch('PASSWORD')

class Side
  attr_reader :name, :base, :prefix, :token

  def initialize(name, base, prefix)
    @name = name
    @base = base.chomp('/')
    @prefix = prefix
    @http = {}
  end

  def request(method, path, body: nil, headers: {}, auth: true)
    uri = URI.parse("#{base}#{prefix}#{path}")
    http = (@http[[uri.host, uri.port]] ||= Net::HTTP.new(uri.host, uri.port).tap { |h| h.use_ssl = uri.scheme == 'https'; h.read_timeout = 120; h.start })
    req = (method == :post ? Net::HTTP::Post : Net::HTTP::Get).new(uri.request_uri)
    req['Accept'] = 'application/json'
    req['Authorization'] = "Bearer #{token}" if auth && token
    headers.each { |k, v| req[k] = v }
    if body
      req['Content-Type'] = 'application/json'
      req.body = JSON.generate(body)
    end
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    res = http.request(req)
    ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round
    json = begin
      res.body.to_s.empty? ? nil : JSON.parse(res.body)
    rescue JSON::ParserError
      nil
    end
    { status: res.code.to_i, json: json, headers: res.to_hash.transform_values(&:first), bytes: res.body.to_s.bytesize, ms: ms }
  end

  def login!(email, password)
    r = request(:post, '/auth/login', body: { email: email, password: password }, auth: false)
    raise "#{name}: login failed #{r[:status]} #{r[:json].inspect}" unless r[:status] == 200

    @token = r[:json]['access_token']
    r
  end
end

VOLATILE = %w[access_token expires_at graph_version version].freeze

def normalise(value, options)
  case value
  when Hash
    value.each_with_object({}) do |(k, v), out|
      out[k] = if VOLATILE.include?(k) && (v.is_a?(String) || v.nil?)
                 v.nil? ? nil : '<volatile>'
               elsif k == 'svg_path' && v.is_a?(String)
                 v.sub(options[:prefix_a], '<prefix>').sub(options[:prefix_b], '<prefix>')
               else
                 normalise(v, options)
               end
    end
  when Array then value.map { |v| normalise(v, options) }
  else value
  end
end

def diff(a, b, path, out, limit = 40)
  return if out.size >= limit

  if a.is_a?(Hash) && b.is_a?(Hash)
    (a.keys | b.keys).each do |k|
      if !a.key?(k) then out << "#{path}.#{k}: only in B"
      elsif !b.key?(k) then out << "#{path}.#{k}: only in A"
      else diff(a[k], b[k], "#{path}.#{k}", out, limit)
      end
    end
  elsif a.is_a?(Array) && b.is_a?(Array)
    out << "#{path}: length #{a.size} (A) vs #{b.size} (B)" if a.size != b.size
    a.zip(b).each_with_index { |(x, y), i| diff(x, y, "#{path}[#{i}]", out, limit) if i < b.size }
  elsif a.is_a?(Numeric) && b.is_a?(Numeric) && a != true && b != true
    out << "#{path}: #{a} (A) vs #{b} (B)" if (a.to_f - b.to_f).abs > 0.011
  elsif a != b
    out << "#{path}: #{a.inspect} (A) vs #{b.inspect} (B)"
  end
end

def sort_graph!(graph)
  return graph unless graph.is_a?(Hash) && graph['nodes']

  graph['nodes'] = graph['nodes'].sort_by { |n| [n['id'], n['level']] }
  graph['edges'] = graph['edges'].sort_by { |e| [e['level'], e['from'], e['to']] } if graph['edges']
  %w[vertical_connections gates].each { |k| graph[k] = graph[k].sort_by { |x| x['id'] } if graph[k] }
  graph
end

a = Side.new('A', options[:a], options[:prefix_a])
b = Side.new('B', options[:b], options[:prefix_b])
failures = 0
compared = 0

compare = lambda do |label, ra, rb, sort: false|
  compared += 1
  ja = normalise(ra[:json], options)
  jb = normalise(rb[:json], options)
  if sort
    sort_graph!(ja)
    sort_graph!(jb)
  end
  problems = []
  problems << "status #{ra[:status]} (A) vs #{rb[:status]} (B)" if ra[:status] != rb[:status]
  diff(ja, jb, '$', problems)
  size = format('%7d B / %7d B', ra[:bytes], rb[:bytes])
  time = format('%4d ms / %4d ms', ra[:ms], rb[:ms])
  if problems.empty?
    puts format('  %-44s identical   %s   %s', label, size, time)
  else
    failures += 1
    puts format('  %-44s DIFFERENT   %s   %s', label, size, time)
    problems.first(15).each { |p| puts "      #{p}" }
  end
end

puts "A: #{a.base}#{a.prefix}   B: #{b.base}#{b.prefix}"
la = a.login!(email, password)
lb = b.login!(email, password)
compare.call('POST /auth/login', la, lb)
compare.call('GET /auth/me', a.request(:get, '/auth/me'), b.request(:get, '/auth/me'))
compare.call('GET /properties', a.request(:get, '/properties'), b.request(:get, '/properties'))
compare.call('GET /properties?tour_enabled=true', a.request(:get, '/properties?tour_enabled=true'), b.request(:get, '/properties?tour_enabled=true'))
compare.call('GET /properties/999999 (404)', a.request(:get, '/properties/999999'), b.request(:get, '/properties/999999'))
compare.call('GET /properties/abc (422)', a.request(:get, '/properties/abc'), b.request(:get, '/properties/abc'))
compare.call('GET /properties (bad token)', a.request(:get, '/properties', headers: { 'Authorization' => 'Bearer nope' }, auth: false),
             b.request(:get, '/properties', headers: { 'Authorization' => 'Bearer nope' }, auth: false))

ids.each do |cid|
  puts "\n== property #{cid} =="
  base = "/properties/#{cid}"
  da = a.request(:get, base)
  db = b.request(:get, base)
  compare.call("GET #{base}", da, db)
  puts "     graph_version A=#{da.dig(:json, 'graph_version')} B=#{db.dig(:json, 'graph_version')}"
  sa = a.request(:get, "#{base}/stops")
  sb = b.request(:get, "#{base}/stops")
  compare.call("GET #{base}/stops", sa, sb)
  ma = a.request(:get, "#{base}/map")
  mb = b.request(:get, "#{base}/map")
  compare.call("GET #{base}/map", ma, mb)
  ga = a.request(:get, "#{base}/graph")
  gb = b.request(:get, "#{base}/graph")
  compare.call("GET #{base}/graph", ga, gb, sort: true)
  if ga[:status] == 200
    etag_a = ga[:headers]['etag']
    etag_b = gb[:headers]['etag']
    na = a.request(:get, "#{base}/graph", headers: { 'If-None-Match' => etag_a })
    nb = b.request(:get, "#{base}/graph", headers: { 'If-None-Match' => etag_b })
    puts format('  %-44s %s   (ETag A=%s B=%s)', "GET #{base}/graph If-None-Match", na[:status] == 304 && nb[:status] == 304 ? '304 / 304' : "#{na[:status]} / #{nb[:status]}", etag_a, etag_b)
    failures += 1 unless na[:status] == 304 && nb[:status] == 304
    level = ga[:json]['levels'].first
    if level
      compare.call("GET #{base}/map/levels/#{level['id']}", a.request(:get, "#{base}/map/levels/#{level['id']}"), b.request(:get, "#{base}/map/levels/#{level['id']}"), sort: true)
    end
    compare.call("GET #{base}/map/levels/floorplate:0 (404)", a.request(:get, "#{base}/map/levels/floorplate:0"), b.request(:get, "#{base}/map/levels/floorplate:0"))
    svg_level = ma[:json]['levels'].find { |l| l['svg_path'] }
    if svg_level
      ra = a.request(:get, "#{base}/map/levels/#{svg_level['id']}/svg")
      rb = b.request(:get, "#{base}/map/levels/#{svg_level['id']}/svg")
      same = ra[:status] == rb[:status] && ra[:headers]['etag'] == rb[:headers]['etag'] && ra[:headers]['x-svg-viewbox'] == rb[:headers]['x-svg-viewbox'] && ra[:bytes] == rb[:bytes]
      compared += 1
      failures += 1 unless same
      puts format('  %-44s %s   %7d B / %7d B   %4d ms / %4d ms   (etag %s / %s, viewBox %s / %s)', "GET #{base}/map/levels/#{svg_level['id']}/svg", same ? 'identical' : 'DIFFERENT',
                  ra[:bytes], rb[:bytes], ra[:ms], rb[:ms], ra[:headers]['etag'], rb[:headers]['etag'], ra[:headers]['x-svg-viewbox'], rb[:headers]['x-svg-viewbox'])
      no_svg = ma[:json]['levels'].find { |l| l['svg_path'].nil? }
      compare.call("GET #{base}/map/levels/#{no_svg['id']}/svg (no_svg)", a.request(:get, "#{base}/map/levels/#{no_svg['id']}/svg"), b.request(:get, "#{base}/map/levels/#{no_svg['id']}/svg")) if no_svg
    end
  end
  next unless sa[:status] == 200

  stops = sa[:json]['groups'].flat_map { |g| g['stops'] }
  all_ids = stops.map { |s| s['id'] }
  routable = stops.select { |s| s['routable'] }.map { |s| s['id'] }
  start = sa[:json]['start_node']
  if all_ids.any?
    compare.call("POST #{base}/stops/distances", a.request(:post, "#{base}/stops/distances", body: { stop_ids: all_ids }), b.request(:post, "#{base}/stops/distances", body: { stop_ids: all_ids }))
  end
  if start && routable.any?
    body = { from_stop_id: start, to_stop_id: routable.first }
    compare.call("POST #{base}/route start→#{routable.first}", a.request(:post, "#{base}/route", body: body), b.request(:post, "#{base}/route", body: body))
    routable.first(options[:pairs]).each_cons(2) do |from, to|
      body = { from_stop_id: from, to_stop_id: to }
      compare.call("POST #{base}/route #{from}→#{to}", a.request(:post, "#{base}/route", body: body), b.request(:post, "#{base}/route", body: body))
    end
    body = { from_stop_id: start, to_stop_id: routable.first, step_free: true }
    compare.call("POST #{base}/route step_free", a.request(:post, "#{base}/route", body: body), b.request(:post, "#{base}/route", body: body))
  end
  body = { from_stop_id: 'unit:1', to_stop_id: start || 'unit:2' }
  compare.call("POST #{base}/route unknown_endpoint", a.request(:post, "#{base}/route", body: body), b.request(:post, "#{base}/route", body: body))
  if routable.any?
    body = { stop_ids: routable.first(options[:pairs]) }
    compare.call("POST #{base}/tour-route (#{body[:stop_ids].size} stops)", a.request(:post, "#{base}/tour-route", body: body), b.request(:post, "#{base}/tour-route", body: body))
  end
  body = { stop_ids: ['unit:1', all_ids.first].compact }
  compare.call("POST #{base}/tour-route invalid_stop", a.request(:post, "#{base}/tour-route", body: body), b.request(:post, "#{base}/tour-route", body: body))
end

puts "\n#{failures.zero? ? 'OK' : 'DIFFERENCES'}: #{compared} comparisons, #{failures} with differences"
exit(failures.zero? ? 0 : 1)
