# In-process legacy/new CMS smoke + write harness.
#   bundle exec rails runner harness.rb OUT.json [LABEL] [--writes] [--api]
# Signs in with Warden's test helper (no cookie is written anywhere), drives the
# HTML/JSON actions through ActionDispatch::Integration::Session and records
# status, exceptions, query counts and content fingerprints per request.
require 'json'
require 'digest'
require 'warden/test/helpers'
include Warden::Test::Helpers

OUT   = ARGV[0] || 'harness.json'
LABEL = ARGV[1] || 'run'
DO_WRITES = ARGV.include?('--writes')
DO_API    = ARGV.include?('--api')
ROLLBACK  = ARGV.include?('--rollback')

Warden.test_mode!
ActionController::Base.allow_forgery_protection = false
user = User.find_by!(email: 'salahudin@pynwheel.com')
login_as(user, scope: :user, run_callbacks: false)

# capture controller exceptions + query counts
$exc = nil; $queries = 0
ActiveSupport::Notifications.subscribe('process_action.action_controller') { |*, payload| $exc = payload[:exception] if payload[:exception] }
ActiveSupport::Notifications.subscribe('sql.active_record') { |*, payload| $queries += 1 unless %w[SCHEMA TRANSACTION].include?(payload[:name]) }

S = ActionDispatch::Integration::Session.new(Rails.application)
S.host! '127.0.0.1'
RESULTS = { label: LABEL, code: `git rev-parse --short HEAD`.strip, schema_version: ActiveRecord::Base.connection.select_value('select max(version) from schema_migrations'),
            db: ActiveRecord::Base.connection.current_database, started: Time.now.utc.iso8601, requests: [], writes: [], api: [] }

def sha(str) = Digest::SHA256.hexdigest(str.to_s)[0, 16]

def req(method, path, params = {}, headers = {}, tag: nil, extract: nil)
  $exc = nil; $queries = 0
  t = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  begin
    S.send(method, path, params: params, headers: headers)
    status = S.response.status; body = S.response.body
  rescue => e
    status = "EXC"; body = ''; $exc = [e.class.name, e.message[0, 300]]
  end
  ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - t) * 1000).round
  row = { tag: tag, method: method.to_s.upcase, path: path, status: status, ms: ms, queries: $queries, bytes: body.bytesize,
          location: (S.response.headers['Location'] rescue nil), exception: $exc }
  if status.is_a?(Integer) && status >= 500
    row[:error_title] = (body[/<h2>(.*?)<\/h2>/m, 1] || body[/<title>(.*?)<\/title>/m, 1]).to_s.gsub(/\s+/, ' ')[0, 300]
  end
  row[:extract] = extract.call(body) rescue { extract_error: $!.message[0, 200] } if extract && status == 200
  RESULTS[:requests] << row
  $stderr.puts "#{status} #{ms}ms q=#{$queries} #{method.to_s.upcase} #{path} #{row[:exception] ? row[:exception].inspect : ''}"
  [status, body]
end

# --- fingerprints -----------------------------------------------------------
def norm_hallways(arr)
  Array(arr).map { |h| [h['id'], h['x_plot'].to_f.round(3), h['y_plot'].to_f.round(3), Array(h['next_points']).sort, h['selected'] ? 1 : 0] }.sort_by(&:first)
end
def norm_hallways_tree(obj) # floor => [..] or building => floor => [..]
  case obj
  when Array then norm_hallways(obj)
  when Hash then obj.sort.map { |k, v| [k.to_s, norm_hallways_tree(v)] }
  else obj
  end
end
def unescape(html) = CGI.unescapeHTML(html)
EXTRACT = {
  links: ->(re) { ->(b) { ids = b.scan(re).flatten.uniq; { count: ids.size, ids_sha: sha(ids.sort.join(',')) } } },
  automate_plotting: ->(b) {
    out = {}
    if (m = b[/name="hallways"[^>]*value="(.*?)"/m, 1]) || (m = b[/id="hallways"[^>]*value="(.*?)"/m, 1])
      tree = JSON.parse(unescape(m)); n = norm_hallways_tree(tree)
      out[:hallways_norm_sha] = sha(n.to_json); out[:hallways_count] = n.to_json.scan(/\[\d+,/).size
      out[:extra_keys] = tree.to_json.scan(/"(source|review_status|space|community_id|confidence|detection_run_id|confirmed_at|created_by_user_id)"/).flatten.uniq.sort
    elsif (m = b[/hallways_coordinates = (\[.*?\])\s*$/m, 1])
      n = norm_hallways(JSON.parse(m)); out[:hallways_norm_sha] = sha(n.to_json); out[:hallways_count] = n.size
      out[:extra_keys] = m.scan(/"(source|review_status|space|community_id)"/).flatten.uniq.sort
    end
    out[:imgs] = b.scan(/<img /).size; out[:svg] = b.scan(/<svg|\.svg/).size
    out
  },
  plotexp: ->(b) {
    out = { imgs: b.scan(/<img /).size, svg_refs: b.scan(/\.svg/).size, unit_links: b.scan(%r{/units/(\d+)}).flatten.uniq.size }
    if (m = b[/hallways_coordinates = (\[.*?\])\s*$/m, 1])
      n = norm_hallways(JSON.parse(m)); out[:hallways_norm_sha] = sha(n.to_json); out[:hallways_count] = n.size
    end
    out
  },
  tours: ->(b) { { tour_stop_links: b.scan(%r{/tour_stops/(\d+)}).flatten.uniq.size, stop_rows_sha: sha(b.scan(%r{/tour_stops/(\d+)}).flatten.uniq.sort.join(',')),
                   elevator_mentions: b.scan(/Elevator/).size, imgs: b.scan(/<img /).size, select_options: b.scan(/<option/).size } },
  shortest: ->(b) { j = JSON.parse(b); po = j['path_object'].to_s; { path_object_sha: sha(po), path_object_len: po.size, is_multiple_buildings: j['is_multiple_buildings'], floor_ids: j['floor_ids'], keys: j.keys.sort } },
  json_rows: ->(b) { j = JSON.parse(b); { rows: j.size, norm_sha: sha(norm_hallways(j).to_json), keys: (j.first || {}).keys.sort } },
}

# --- property discovery (real data, not only fixed ids) ----------------------
conn = ActiveRecord::Base.connection
named = [1411, 1618, 1412, 2934, 1468, 557, 2919, 1105, 1839, 1234, 1786, 2935, 1413, 1935, 2000]
disc = conn.select_rows(<<~SQL).flatten
  with c as (select c.id,
    (select count(*) from hallways h where (h.parent_type='Floorplate' and h.parent_id in (select id from floorplates f where f.community_id=c.id)) or (h.parent_type='Sitemap' and h.parent_id in (select id from sitemaps s where s.id=c.id or s.community_id=c.id))) hw,
    (select count(*) from floorplates f where f.community_id=c.id and coalesce(f.svg_image,'')<>'') svg,
    (select count(distinct building) from units u where u.community_id=c.id and coalesce(u.building,'')<>'') bld,
    (select count(*) from elevators e where e.community_id=c.id) el, c.is_sitemap, c.self_tour
    from communities c)
  (select id from c where hw>0 and svg>0 order by hw desc limit 2)
  union (select id from c where hw>0 and bld>1 and el>0 order by hw desc limit 2)
  union (select id from c where hw>0 and is_sitemap order by hw desc limit 2)
  union (select id from c where hw>0 and not self_tour order by hw desc limit 1)
  union (select id from c where hw=0 and self_tour and svg=0 order by id desc limit 1)
SQL
ids = (named + disc).uniq.select { |i| Community.exists?(i) }
ids = ENV['HARNESS_IDS'].split(',').map(&:to_i) if ENV['HARNESS_IDS'].present?
RESULTS[:communities] = ids
$stderr.puts "communities: #{ids.inspect}"

# --- read matrix --------------------------------------------------------------
req(:get, '/', tag: 'home')
req(:get, '/companies', tag: 'companies', extract: EXTRACT[:links].(%r{/companies/(\d+)/edit}))
company = Company.order(:id).first
req(:get, "/companies/#{company.id}/edit", tag: 'company_edit')
req(:get, "/companies/#{company.id}/communities", tag: 'company_communities', extract: EXTRACT[:links].(%r{/communities/(\d+)}))
req(:get, '/communities', tag: 'properties', extract: EXTRACT[:links].(%r{/communities/(\d+)/edit}))
req(:get, '/communities?search=demo', tag: 'properties_search', extract: EXTRACT[:links].(%r{/communities/(\d+)/edit}))
# the pages above need a company in the session (legacy current_company); the company-scoped routes set it
big = Company.joins(:communities).group('companies.id').order(Arel.sql('count(communities.id) desc')).first
req(:get, "/companies/#{big.id}/communities", tag: 'company_properties_list', extract: EXTRACT[:links].(%r{/communities/(\d+)}))
req(:get, "/companies/#{big.id}/communities?search=a", tag: 'company_properties_search', extract: EXTRACT[:links].(%r{/communities/(\d+)}))

ids.each do |cid|
  c = Community.find(cid)
  base = "/communities/#{cid}"
  req(:get, "#{base}/edit", tag: "property_edit:#{cid}")
  req(:get, "/companies/#{c.company_id}/communities/#{cid}/edit", tag: "company_property_edit:#{cid}") if c.company_id
  req(:get, "#{base}/units", tag: "units:#{cid}", extract: EXTRACT[:links].(%r{/units/(\d+)/edit}))
  req(:get, "#{base}/amenities", tag: "amenities:#{cid}", extract: EXTRACT[:links].(%r{/amenities/(\d+)/edit}))
  req(:get, "#{base}/elevators", tag: "elevators:#{cid}", extract: EXTRACT[:links].(%r{/elevators/(\d+)}))
  req(:get, "#{base}/floorplans", tag: "floorplans:#{cid}", extract: EXTRACT[:links].(%r{/floorplans/(\d+)}))
  if c.is_sitemap
    req(:get, "#{base}/sitemaps", tag: "sitemaps:#{cid}")
    req(:get, "#{base}/sitemaps/plotexp", tag: "sitemap_plotexp:#{cid}", extract: EXTRACT[:plotexp])
    req(:get, "#{base}/sitemaps/plot_amenities", tag: "sitemap_plot_amenities:#{cid}", extract: EXTRACT[:plotexp])
  else
    req(:get, "#{base}/floorplates", tag: "floorplates:#{cid}", extract: EXTRACT[:links].(%r{/floorplates/(\d+)}))
    c.floorplates.order(:id).limit(3).each do |fp|
      req(:get, "#{base}/floorplates/#{fp.id}/plotexp", tag: "plotexp:#{cid}:#{fp.id}", extract: EXTRACT[:plotexp])
      req(:get, "#{base}/floorplates/#{fp.id}/amenities/plot_amenities", tag: "plot_amenities:#{cid}:#{fp.id}", extract: EXTRACT[:plotexp])
    end
  end
  req(:get, "/automate_plotting?community_id=#{cid}", tag: "map:#{cid}", extract: EXTRACT[:automate_plotting])
  ['sorting', 'actual shortest'].each do |pt|
    req(:get, "/automate_plotting/shortest_path?community_id=#{cid}&path_type=#{CGI.escape(pt)}", {}, { 'Accept' => '*/*' }, tag: "shortest:#{cid}:#{pt}", extract: EXTRACT[:shortest])
  end
  req(:get, "#{base}/tours", tag: "tour_setup:#{cid}", extract: EXTRACT[:tours])
  req(:get, "#{base}/tours/starting_point", tag: "tour_starting_point:#{cid}", extract: EXTRACT[:tours])
  req(:get, "#{base}/tours/select_stops", tag: "tour_select_stops:#{cid}", extract: EXTRACT[:tours])
  req(:get, "#{base}/tours/settings", tag: "tour_settings:#{cid}")
end

# --- legacy write cycle (committed; the clone is disposable) ------------------
def counts_for(cid)
  fps = Floorplate.where(community_id: cid).pluck(:id)
  { hallways: Hallway.where(parent_type: 'Floorplate', parent_id: fps).count + Hallway.where(parent_type: 'Sitemap', parent_id: Sitemap.where(community_id: cid).pluck(:id)).count,
    elevators: Elevator.where(community_id: cid).count, tour_stops: TourStop.joins(:tour).where(tours: { community_id: cid }).count,
    units: Unit.where(community_id: cid).count, doors: Door.where(community_id: cid).count, bsps: BuildingStartingPoint.where(community_id: cid).count }
end
def hallway_row(id)
  h = Hallway.find_by(id: id); return nil unless h
  h.attributes.except('created_at', 'updated_at')
end

if DO_WRITES
 ActiveRecord::Base.transaction do
  [[1411, :floorplate], [1618, :floorplate], [1786, :sitemap]].each do |cid, kind|
    next unless Community.exists?(cid)
    c = Community.find(cid); w = { community: cid, kind: kind, steps: [] }
    w[:before] = counts_for(cid)
    level = kind == :sitemap ? Sitemap.find_by(community_id: cid) : c.floorplates.joins(:hallways).group('floorplates.id').order('count(hallways.id) desc').first
    level ||= c.floorplates.first
    key = kind == :sitemap ? :sitemap_id : :floor_plate_id
    hw = level.hallways.order(:id)
    prev = hw.where(selected: true).first || hw.last
    # 1. add a point chained from the selected one
    st, body = req(:post, '/save_hallways_point', { key => level.id, new_point: { x_plot: 111, y_plot: 222, selected: true, next_points: [] }.to_json, previous_point: ({ id: prev.id }.to_json if prev) }.compact, tag: "w:add_point:#{cid}", extract: EXTRACT[:json_rows])
    new_id = (JSON.parse(body).map { |r| r['id'] }.max rescue nil)
    w[:steps] << { step: 'add_point', status: st, new_id: new_id, row: hallway_row(new_id), prev_row: hallway_row(prev&.id) }
    # 2. move it
    st, = req(:post, '/update_hallways_point', { key => level.id, current_id: new_id, x_plot: 120, y_plot: 230 }, tag: "w:move_point:#{cid}", extract: EXTRACT[:json_rows])
    w[:steps] << { step: 'move_point', status: st, row: hallway_row(new_id) }
    # 3. connect leaf to another node, then select
    other = hw.where.not(id: [new_id, prev&.id]).first
    if other
      st, = req(:post, '/connect_leaf_point', { key => level.id, previous_id: new_id, current_id: other.id }, tag: "w:connect_leaf:#{cid}", extract: EXTRACT[:json_rows])
      w[:steps] << { step: 'connect_leaf', status: st, row: hallway_row(new_id), other_row: hallway_row(other.id) }
      st, = req(:post, '/save_selected_point', { key => level.id, previous_id: new_id, current_id: other.id }, tag: "w:save_selected:#{cid}")
      w[:steps] << { step: 'save_selected', status: st, selected_count: level.hallways.where(selected: true).count }
    end
    # 4. delete it
    st, = req(:post, '/delete_hallways_point', { key => level.id, current_id: new_id }, tag: "w:delete_point:#{cid}", extract: EXTRACT[:json_rows])
    w[:steps] << { step: 'delete_point', status: st, row_after: hallway_row(new_id), prev_row_after: hallway_row(prev&.id), selected_count: level.hallways.where(selected: true).count }
    # 5. Tour Setup: toggle a stop twice, add + delete an elevator, move a BSP, move an elevator
    tour = c.community_tour
    if tour && (ts = tour.tour_stops.first)
      before = ts.display_stop
      st, = req(:post, "/communities/#{cid}/tours/display_stop", { stop_id: ts.id }, tag: "w:display_stop:#{cid}")
      mid = TourStop.find(ts.id).display_stop
      st2, = req(:post, "/communities/#{cid}/tours/display_stop", { stop_id: ts.id }, tag: "w:display_stop_back:#{cid}")
      w[:steps] << { step: 'display_stop_toggle', status: [st, st2], before: before, mid: mid, after: TourStop.find(ts.id).display_stop }
    end
    if tour && kind == :floorplate
      fp = c.floorplates.first
      st, body = req(:post, "/add_elevator/#{tour.id}/#{cid}", { floorplate: fp.id, building: '' }, tag: "w:add_elevator:#{cid}")
      ts_id = (JSON.parse(body).dig('path', 'id') rescue nil); el_id = (JSON.parse(body).dig('path', 'stop_id') rescue nil)
      el = Elevator.find_by(id: el_id)
      w[:steps] << { step: 'add_elevator', status: st, tour_stop_id: ts_id, elevator: el&.attributes&.slice('id', 'name', 'x_plot', 'y_plot', 'kind', 'accessible', 'floor_positions', 'floorplate_covering_range') }
      st, = req(:post, "/update_elevator", { community_id: cid, elevator_id: el_id, x_plot: 55, y_plot: 66 }, tag: "w:update_elevator:#{cid}")
      w[:steps] << { step: 'update_elevator', status: st, elevator_xy: Elevator.find_by(id: el_id)&.attributes&.slice('x_plot', 'y_plot'), stop_latlng: TourStop.find_by(id: ts_id)&.attributes&.slice('latitude', 'longitude') }
      st, = req(:delete, "/communities/#{cid}/tours/#{tour.id}/tour_stops/#{ts_id}", {}, tag: "w:delete_elevator_stop:#{cid}")
      w[:steps] << { step: 'delete_elevator_stop', status: st, elevator_left: Elevator.exists?(el_id), stop_left: TourStop.exists?(ts_id) }
    end
    if tour && (bsp = BuildingStartingPoint.where(community_id: cid).first) && TourStop.find_by(stop_id: bsp.id, stop_type: 'building_starting_point')
      x, y = bsp.x_plot, bsp.y_plot
      st, = req(:post, "/communities/#{cid}/tours/update_building_starting_point.json", { bsp_id: bsp.id, x_plot: x, y_plot: y }, tag: "w:update_bsp:#{cid}")
      w[:steps] << { step: 'update_bsp', status: st }
    end
    # 6. unit edit through the legacy form (same value) -> update + TourStop.update_all
    if (u = Unit.where(community_id: cid).first)
      st, = req(:patch, "/communities/#{cid}/units/#{u.id}", { unit: { marketing_name: u.marketing_name } }, tag: "w:unit_update:#{cid}")
      w[:steps] << { step: 'unit_update', status: st, unit_name: Unit.find(u.id).marketing_name }
    end
    w[:after] = counts_for(cid)
    RESULTS[:writes] << w
  end
  RESULTS[:writes_rolled_back] = ROLLBACK
  raise ActiveRecord::Rollback if ROLLBACK
 end
end

# --- Tour App / mobile API ----------------------------------------------------
if DO_API
  [1411, 1618, 1412, 2934, 557].each do |cid|
    next unless Community.exists?(cid)
    tu = TourUser.joins(:schedual_tours).where(schedual_tours: { community_id: cid }).first rescue nil
    q = "tour_user_id=#{tu&.id}"
    paths = %W[/api/self_tour/v1/communities/#{cid}/wayfinding.json?#{q} /api/self_tour/v1/communities/#{cid}/wayfinding/tour_route.json?#{q}]
    paths.unshift("/api/self_tour/v1/communities/#{cid}/start_tour.json?#{q}") if tu
    paths.each do |p|
      st, body = req(p.include?('start_tour') ? :delete : :get, p, tag: "api:#{File.basename(p.split('?').first)}:#{cid}")
      if p.include?('start_tour') && st == 200
        j = (JSON.parse(body) rescue {})
        elev = j.to_s.scan(/Audit (stairs|lift)/).flatten.tally
        RESULTS[:api] << { path: p, status: st, keys: j.keys.sort, audit_mentions: elev, elevator_mentions: j.to_s.scan(/"elevator/).size, bytes: body.bytesize }
        next
      end
      RESULTS[:api] << { path: p, status: st, sha: sha(body), bytes: body.bytesize, keys: (JSON.parse(body).keys.sort rescue nil) }
    end
  end
end

RESULTS[:finished] = Time.now.utc.iso8601
File.write(OUT, JSON.pretty_generate(RESULTS))
bad = RESULTS[:requests].reject { |r| [200, 302].include?(r[:status]) }
$stderr.puts "DONE #{RESULTS[:requests].size} requests, #{bad.size} non-200/302: #{bad.map { |r| [r[:status], r[:path]] }.inspect[0, 2000]}"
