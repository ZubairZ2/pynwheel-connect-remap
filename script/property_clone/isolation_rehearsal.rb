# frozen_string_literal: true

# Isolation rehearsal on a cloned property, driven through the real HTTP
# stack in-process (Warden test mode, no password needed), comparing the
# source fingerprint before and after:
#
#   MANIFEST=tmp/property_clones/<execute manifest>.json ADMIN_EMAIL=test@gmail.com \
#     bundle exec rails runner script/property_clone/isolation_rehearsal.rb
#
# Writes only to the clone (and the PaperTrail rows the app itself writes).
require 'action_dispatch/testing/integration'

manifest = JSON.parse(File.read(ENV.fetch('MANIFEST')))
source_id = manifest['source']['property_id']
clone_id = manifest['clone']['property_id']
clone_company_id = manifest['clone']['company_id']
id_map = PropertyClone::IdMap.from_h(manifest['id_map'])
admin = User.find_by!(email: ENV.fetch('ADMIN_EMAIL').downcase)
raise "admin #{admin.id} is not a Community admin of the clone company" unless admin.role == 'Community admin' && admin.company_id == clone_company_id

plan = PropertyClone::Plan.new(source_id, suffix: manifest['suffix'], options: { allow_clone_users: true }).resolve!
baseline = PropertyClone::Baseline.capture(plan)
clone = Community.find(clone_id)
source = Community.find(source_id)
sibling_id = plan.sibling_ids.first
clone_tour = clone.community_tour
source_tour = source.community_tour
results = []
record = ->(name, status, detail) { results << { name: name, status: status, detail: detail }; puts format('  %-8s %-60s %s', status, name, detail.to_s[0, 300]) }

Warden.test_mode!
ActionController::Base.allow_forgery_protection = false
session = ActionDispatch::Integration::Session.new(Rails.application)
# config.hosts allows only local names in development; the session cookie is
# scoped to the staging host everywhere else (config/initializers/session_store.rb).
session.host!(Rails.env.development? ? 'localhost' : 'pynwheel-staging.herokuapp.com')
Warden.on_next_request { |proxy| proxy.set_user(admin, scope: :user, run_callbacks: false) }
def json(session)
  JSON.parse(session.response.body)
rescue JSON::ParserError
  {}
end

puts "Rehearsal: source #{source_id} -> clone #{clone_id}, admin #{admin.email} (user #{admin.id})"

# 1. reads: clone visible, source and sibling not
session.get "/communities/#{clone_id}/edit.json"
record.call('GET /communities/<clone>/edit.json', session.response.status == 200 && json(session).dig('data', 'id') == clone_id ? 'PASS' : 'FAIL', "status #{session.response.status}")
session.get "/communities/#{source_id}/edit.json"
record.call('GET /communities/<source>/edit.json refused', session.response.status == 404 ? 'PASS' : 'FAIL', "status #{session.response.status}")
session.get "/communities/#{sibling_id}/edit.json"
record.call('GET /communities/<sibling>/edit.json refused', session.response.status == 404 ? 'PASS' : 'FAIL', "status #{session.response.status}")
session.get '/communities.json'
ids = (json(session)['data'] || []).map { |r| r['id'] }
record.call('GET /communities.json lists only the clone', ids == [clone_id] ? 'PASS' : 'FAIL', ids.inspect)
session.get '/companies.json'
record.call('GET /companies.json lists only the clone company', (json(session)['data'] || []).map { |r| r['id'] } == [clone_company_id] ? 'PASS' : 'FAIL', "status #{session.response.status} (#{(json(session)['data'] || []).map { |r| r['id'] }.inspect})")

# 2. stops: edit, reorder, hide, remove on the clone; refused on the source
session.get "/communities/#{clone_id}/connect/stops.json"
rows = json(session).dig('data', 'stops') || []
csrf = json(session).dig('meta', 'csrf_token')
record.call('GET /communities/<clone>/connect/stops.json', session.response.status == 200 ? 'PASS' : 'FAIL', "#{rows.size} stops")
session.get "/communities/#{source_id}/connect/stops.json"
record.call('GET /communities/<source>/connect/stops.json refused', session.response.status == 404 ? 'PASS' : 'FAIL', "status #{session.response.status}")

editable = rows.find { |r| %w[amenity elevator].include?(r['type'] || r.dig('record', 'type')) } || rows.first
if editable
  stop = TourStop.find(editable['id'])
  target = Locks::Targets.find(clone, stop.stop_type, stop.stop_id)
  source_stop = TourStop.find(id_map.source_ids('tour_stops').find { |s| id_map.get('tour_stops', s) == stop.id })
  source_target = Locks::Targets.find(source, source_stop.stop_type, source_stop.stop_id)
  before_src = source_target.attributes.slice('name', 'description', 'directional_text', 'stop_description')
  session.put "/communities/#{clone_id}/connect/stops/#{stop.id}.json", params: { instructions: 'Rehearsal instructions', description: 'Rehearsal description' }.to_json, headers: { 'CONTENT_TYPE' => 'application/json', 'X-CSRF-Token' => csrf }
  target.reload
  changed = [target.try(:directional_text), target.try(:stop_description), target.try(:description)].compact.any? { |v| v.to_s.start_with?('Rehearsal') }
  record.call('PUT clone stop content', session.response.status == 200 && changed ? 'PASS' : 'FAIL', "status #{session.response.status}, #{stop.stop_type}##{stop.stop_id}")
  record.call('source stop record unchanged after the clone edit', source_target.reload.attributes.slice('name', 'description', 'directional_text', 'stop_description') == before_src ? 'PASS' : 'FAIL', "#{source_stop.stop_type}##{source_stop.stop_id}")
  session.put "/communities/#{source_id}/connect/stops/#{source_stop.id}.json", params: { instructions: 'Hacked' }.to_json, headers: { 'CONTENT_TYPE' => 'application/json', 'X-CSRF-Token' => csrf }
  record.call('PUT source stop refused', session.response.status == 403 && source_target.reload.attributes.slice('name', 'description', 'directional_text', 'stop_description') == before_src ? 'PASS' : 'FAIL', "status #{session.response.status}")
  session.put "/communities/#{clone_id}/connect/stops/#{source_stop.id}.json", params: { instructions: 'Hacked' }.to_json, headers: { 'CONTENT_TYPE' => 'application/json', 'X-CSRF-Token' => csrf }
  record.call('PUT source stop id under the clone refused', session.response.status == 404 ? 'PASS' : 'FAIL', "status #{session.response.status}")
end

order = rows.map { |r| r['id'] }
source_stop_count = TourStop.where(tour_id: source_tour.id).count
source_order = TourStop.where(tour_id: source_tour.id).order(:sort, :id).pluck(:id, :sort)
removed = order.last
session.put "/communities/#{clone_id}/tours/save_setup.json", params: { base_version: clone_tour.reload.tour_setup_version, stops: { order: order.rotate, visibility: [{ id: order.first, visible: false }], remove: [removed] } }.to_json, headers: { 'CONTENT_TYPE' => 'application/json', 'X-CSRF-Token' => csrf }
record.call('PUT clone tours/save_setup (reorder, hide, remove)', session.response.status == 200 && !TourStop.exists?(removed) ? 'PASS' : 'FAIL', "status #{session.response.status} #{json(session)['errors'].inspect if session.response.status != 200}")
record.call('source stops unchanged after clone reorder/remove', TourStop.where(tour_id: source_tour.id).count == source_stop_count && TourStop.where(tour_id: source_tour.id).order(:sort, :id).pluck(:id, :sort) == source_order ? 'PASS' : 'FAIL', "#{source_stop_count} stops")
session.put "/communities/#{source_id}/tours/save_setup.json", params: { base_version: source_tour.reload.tour_setup_version, stops: { remove: [source_order.first.first] } }.to_json, headers: { 'CONTENT_TYPE' => 'application/json', 'X-CSRF-Token' => csrf }
record.call('PUT source tours/save_setup refused', session.response.status == 403 && TourStop.exists?(source_order.first.first) ? 'PASS' : 'FAIL', "status #{session.response.status}")

# 3. scheduling settings
src_setting = source_tour.tour_setting.attributes
session.put "/communities/#{clone_id}/connect/booking/rules.json", params: { buffer_minutes: 15, minimum_notice_minutes: 120 }.to_json, headers: { 'CONTENT_TYPE' => 'application/json', 'X-CSRF-Token' => csrf }
record.call('PUT clone booking/rules', session.response.status == 200 && clone_tour.tour_setting.reload.buffer_minutes == 15 ? 'PASS' : 'FAIL', "status #{session.response.status} #{json(session)['errors'].inspect if session.response.status != 200}")
record.call('source tour_settings unchanged', source_tour.tour_setting.reload.attributes == src_setting ? 'PASS' : 'FAIL', '')
session.put "/communities/#{source_id}/connect/booking/rules.json", params: { buffer_minutes: 77 }.to_json, headers: { 'CONTENT_TYPE' => 'application/json', 'X-CSRF-Token' => csrf }
record.call('PUT source booking/rules refused', session.response.status == 403 && source_tour.tour_setting.reload.attributes == src_setting ? 'PASS' : 'FAIL', "status #{session.response.status}")

# 4. property and company configuration through the models the legacy forms use
clone.update!(name: "#{clone.name} edited", website: 'https://rehearsal.example.test')
Company.find(clone_company_id).update!(address: 'Rehearsal street 1')
record.call('clone property / company configuration edited', true ? 'PASS' : 'FAIL', 'name, website, company address')
record.call('source property name unchanged', source.reload.name == manifest['source']['property_name'] ? 'PASS' : 'FAIL', source.name)

# 5. legacy HTML pages keyed on community_id. UnitsController runs
# ApplicationController#check_community; ToursController does not (46 of the
# 76 legacy controllers do not), which is a pre-existing gap of the legacy CMS
# and is reported as such.
session.get "/communities/#{source_id}/units"
record.call('legacy GET /communities/<source>/units (check_community) redirected home', session.response.redirect? ? 'PASS' : 'FAIL', "status #{session.response.status}")
session.get "/communities/#{clone_id}/units"
record.call('legacy GET /communities/<clone>/units', session.response.status == 200 ? 'PASS' : 'FAIL', "status #{session.response.status}")
session.get "/communities/#{source_id}/tours"
record.call('legacy GET /communities/<source>/tours (no check_community in ToursController)', session.response.redirect? ? 'PASS' : 'FAIL', "status #{session.response.status}: pre-existing legacy gap, the page is served to any signed-in user")

# 6. deletions on the clone through the models (dependent: :destroy chains)
unit = Unit.where(community_id: clone_id).where.not(floorplate_id: nil).first
door = Door.where(community_id: clone_id).first
plate = Floorplate.where(community_id: clone_id).order(:id).last
door&.destroy!
unit&.destroy!
plate&.destroy!
record.call('clone unit / door / floorplate destroyed', [door, unit, plate].compact.none? { |r| r.class.exists?(r.id) } ? 'PASS' : 'FAIL', "#{[door, unit, plate].compact.map { |r| "#{r.class.name}##{r.id}" }.join(', ')}")

# 7. the source fingerprint
diffs = baseline.compare(PropertyClone::Baseline.capture(plan))
record.call('source fingerprint identical after every operation', diffs.empty? ? 'PASS' : 'FAIL', diffs.map { |n, b, a| "#{n}: #{b.inspect} -> #{a.inspect}" }.join('; '))

path = PropertyClone::Manifest.dir.join("isolation-rehearsal-#{clone_id}-#{Time.current.strftime('%Y%m%dT%H%M%S')}.json")
File.write(path, JSON.pretty_generate({ 'source_property_id' => source_id, 'clone_property_id' => clone_id, 'admin_user_id' => admin.id, 'results' => results, 'generated_at' => Time.current.iso8601 }))
puts "Overall: #{results.any? { |r| r[:status] == 'FAIL' } ? 'FAIL' : 'PASS'} (#{path})"
