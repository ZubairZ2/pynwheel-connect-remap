#!/usr/bin/env ruby
# frozen_string_literal: true

# Measures the live Tour App API with real data: response time and payload
# size per endpoint, for one or more properties.
#
#   TOUR_API_URL=http://127.0.0.1:3100 EMAIL=... PASSWORD=... ruby script/tour_api_measure.rb 1411 1618 2934
#
# TOUR_API_PREFIX defaults to /api/tour/v1 (the Rails API); pass /api/v1 to
# measure the former FastAPI service. Each request is made twice and the
# second (warm) timing is reported next to the first.
require 'json'
require 'net/http'
require 'uri'

base = ENV.fetch('TOUR_API_URL', 'http://127.0.0.1:3100').chomp('/')
prefix = ENV.fetch('TOUR_API_PREFIX', '/api/tour/v1')
email = ENV.fetch('EMAIL')
password = ENV.fetch('PASSWORD')
ids = ARGV.map(&:to_i)
ids = [1411] if ids.empty?

uri = URI.parse(base)
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == 'https'
http.read_timeout = 120
http.start
token = nil

timed = lambda do |method, path, body: nil, headers: {}, repeat: 2|
  results = []
  repeat.times do
    req = (method == :post ? Net::HTTP::Post : Net::HTTP::Get).new("#{prefix}#{path}")
    req['Accept'] = 'application/json'
    req['Authorization'] = "Bearer #{token}" if token
    headers.each { |k, v| req[k] = v }
    if body
      req['Content-Type'] = 'application/json'
      req.body = JSON.generate(body)
    end
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    res = http.request(req)
    results << [res, ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000)]
  end
  res, first_ms = results.first
  warm_ms = results.last[1]
  puts format('  %-4s %-58s %3d %7.1f ms (warm %7.1f ms) %10s B', method.to_s.upcase, path, res.code.to_i, first_ms, warm_ms, res.body.to_s.bytesize.to_s.gsub(/(\d)(?=(\d{3})+\z)/, '\1,'))
  res
end

res = timed.call(:post, '/auth/login', body: { email: email, password: password }, repeat: 1)
raise "login failed: #{res.code} #{res.body}" unless res.code.to_i == 200

token = JSON.parse(res.body)['access_token']
timed.call(:get, '/auth/me')
timed.call(:get, '/properties')
timed.call(:get, '/properties?tour_enabled=true')
ids.each do |cid|
  puts "\n== property #{cid} =="
  timed.call(:get, "/properties/#{cid}")
  stops = timed.call(:get, "/properties/#{cid}/stops")
  map = timed.call(:get, "/properties/#{cid}/map")
  graph = timed.call(:get, "/properties/#{cid}/graph")
  if graph.code.to_i == 200
    timed.call(:get, "/properties/#{cid}/graph", headers: { 'If-None-Match' => graph['ETag'] })
    level = JSON.parse(graph.body)['levels'].first
    timed.call(:get, "/properties/#{cid}/map/levels/#{level['id']}") if level
  end
  if map.code.to_i == 200 && (svg = JSON.parse(map.body)['levels'].find { |l| l['svg_path'] })
    r = timed.call(:get, "/properties/#{cid}/map/levels/#{svg['id']}/svg")
    puts "       svg etag #{r['ETag']} viewBox #{r['X-Svg-ViewBox']}" if r.code.to_i == 200
    timed.call(:get, "/properties/#{cid}/map/levels/#{svg['id']}/svg", headers: { 'If-None-Match' => r['ETag'] }) if r.code.to_i == 200
  end
  next unless stops.code.to_i == 200

  data = JSON.parse(stops.body)
  all = data['groups'].flat_map { |g| g['stops'] }
  all_ids = all.map { |s| s['id'] }
  routable = all.select { |s| s['routable'] }.map { |s| s['id'] }
  start = data['start_node']
  timed.call(:post, "/properties/#{cid}/stops/distances", body: { stop_ids: all_ids }) if all_ids.any?
  timed.call(:post, "/properties/#{cid}/route", body: { from_stop_id: start, to_stop_id: routable.first }) if start && routable.any?
  next unless routable.any?

  r = timed.call(:post, "/properties/#{cid}/tour-route", body: { stop_ids: routable.first(6) })
  if r.code.to_i == 200
    tour = JSON.parse(r.body)
    puts "       segments #{tour['segments'].size}, skipped #{tour['skipped']}, steps #{tour['route']['steps'].size}, floors #{tour['route']['floors'].map { |f| f['name'] }}"
    tour['segments'].first(3).each { |seg| puts "         #{seg['stop_id']} ← #{seg['from_stop_id']}: #{seg['route']['steps'].map { |s| "#{s['title']} · #{s['description']}" }.join(' | ')}" }
  else
    puts "       #{r.body}"
  end
end
timed.call(:post, '/auth/logout', repeat: 1)
timed.call(:get, '/auth/me', repeat: 1)
