require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

# The visits the new Tour App records (October 23, 2026): check-in, the stop
# and door events, the end, and what Connect's Visitors then shows. Both
# principals: a signed-in visitor (own rows only) and a Super Admin driving a
# visit on a visitor's behalf.
class Api::TourApp::V1::VisitsTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper
  include TourApiJobsStub

  setup do
    fake_jobs!
    build_tour_app_fixtures!
    @community.update_columns(time_zone: 'America/Denver', latitude: 39.7392, longitude: -104.9903, email: 'leasing@example.test', alert_contact: 2)
    @tour.update_columns(grace_period: 15, visual_id_verification: false, only_scheduled_tour: false)
    TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: true, time_intervel: '30 min', length_stay_limit: 45, do_limit_max_tour: false)
    %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].each_with_index do |day, i|
      OpeningHour.create!(community_id: @community.id, day: day, opening_time: '00:00', closing_time: '23:59', sort: i + 1)
    end
    @zone = ActiveSupport::TimeZone['America/Denver']
    @now = Time.now.in_time_zone(@zone)
    @ann = TourUser.create!(first_name: 'Ann', last_name: 'Lee', name: 'Ann Lee', email: 'ann@example.test', phone_number: '+13035550101')
    @bob = TourUser.create!(first_name: 'Bob', last_name: 'Ray', name: 'Bob Ray', email: 'bob@example.test', phone_number: '+13035550102')
    @ann_token, = Visitors::Session.issue!(@ann)
    @bob_token, = Visitors::Session.issue!(@bob)
    @staff = api_token_for(users(:super_admin))
    @token = @ann_token
    @uuid = SecureRandom.uuid
  end

  teardown do
    restore_jobs!
    reset_tour_api_caches!
  end

  # Fixes against the property at 39.7392, -104.9903: the default one 300 m
  # north of it (verified), the others by their distance.
  NEAR = { latitude: 39.7419, longitude: -104.9903, accuracy_m: 20 }.freeze
  AT_800_M = { latitude: 39.7464, longitude: -104.9903 }.freeze
  AT_3_KM = { latitude: 39.7662, longitude: -104.9903, accuracy_m: 20 }.freeze
  AT_20_KM = { latitude: 39.9192, longitude: -104.9903 }.freeze

  def start_visit(payload = {}, headers = auth)
    post_json("#{@base}/visits", { client_visit_id: @uuid, tour_type: 'self_tour', device_time_zone: 'America/Denver', app_version: '2.1.0', fix_at: @now.iso8601 }.merge(NEAR).merge(payload), headers)
  end

  # The same request with no fix at all.
  def start_visit_without_fix(payload = {}, headers = auth)
    start_visit({ latitude: nil, longitude: nil, accuracy_m: nil, fix_at: nil }.merge(payload), headers)
  end

  def with_location_required(mode)
    ENV['PYN_TOUR_LOCATION_REQUIRED'] = mode
    yield
  ensure
    ENV.delete('PYN_TOUR_LOCATION_REQUIRED')
  end

  def arrival_mails
    ActionMailer::Base.deliveries.select { |m| m.subject.to_s.include?('tour has begun') }
  end

  def events(visit_id, list, headers = auth)
    post_json("#{@base}/visits/#{visit_id}/events", { device_id: 'pixel-7', events: list }, headers)
  end

  def connect_rows
    sign_in users(:community_admin)
    get "/communities/#{@community.id}/connect/visitors.json"
    assert_response :success
    JSON.parse(response.body)['data']['rows'].index_by { |r| r['id'] }
  end

  test 'check-in writes the visit the legacy app would have, idempotently, and Connect shows it in progress' do
    start_visit
    assert_response :created, response.body
    visit = body['visit']
    assert visit['created']
    assert_equal 'in_progress', visit['status']
    assert_equal ['self_tour', 'onsite', 'tour_app', true, 45], [visit['tour_type'], visit['tour_site'], visit['source'], visit['active'], visit['access_window']['minutes']]
    assert_nil visit['booking_id']
    refute visit['verification_required']
    row = TourHistory.find(visit['id'])
    assert_equal [@ann.id, @tour.id, @community.id, 'tour_app', @uuid, true, 'abandoned', 'self_tour', 'America/Denver'],
                 [row.tour_user_id, row.tour_id, row.community_id, row.source, row.client_visit_id, row.active_app, row.tour_state, row.tour_status, row.my_time_zone]
    assert_equal visit['tour_key'], row.tour_key
    assert_equal ['self_tour', row.tour_key], [@ann.reload.tour_type, @ann.tour_key], 'the visitor row carries the tour as initialize_tour set it'
    assert PaperTrail::Version.where(item_type: 'Community', event: 'visit_started', whodunnit: "visitor:#{@ann.id}").exists?

    start_visit
    assert_response :success
    assert_equal row.id, body['visit']['id']
    refute body['visit']['created']
    start_visit(client_visit_id: SecureRandom.uuid)
    assert_equal row.id, body['visit']['id'], 'an open visit is reused whatever the client id'
    assert_equal 1, TourHistory.where(tour_user_id: @ann.id).count

    rows = connect_rows
    assert_equal 'in_progress', rows[@ann.id]['status']
    assert_equal 'Walk-in', rows[@ann.id]['source']
    assert_equal 1, rows[@ann.id]['visits']
  end

  test 'a booking inside its window is linked and completed by the end; outside it the check-in is refused' do
    on_time = SchedualTour.create!(community_id: @community.id, tour_user_id: @ann.id, tour_date: @now.to_date, tour_time: @now.strftime('%H:%M'), tour_type: 'guided_tour', property_tour_type: 'scheduled_tour', created_by: 'Tour App')
    start_visit(booking_id: on_time.id, tour_type: 'self_tour')
    assert_response :created, response.body
    assert_equal on_time.id, body['visit']['booking_id']
    assert_equal 'guided_tour', body['visit']['tour_type'], 'the booking decides the tour type'
    assert_equal on_time.id, body['booking']['id']
    visit_id = body['visit']['id']

    post_json("#{@base}/visits/#{visit_id}/end", { reason: 'completed' })
    assert_response :success, response.body
    assert_equal 'completed', body['visit']['status']
    assert body['visit']['ended_at']
    row = TourHistory.find(visit_id)
    assert_equal ['completed', 'completed', false], [row.tour_state, row.ended_reason, row.active_app]
    assert on_time.reload.is_tour_completed
    assert on_time.tour_completed_at
    post_json("#{@base}/visits/#{visit_id}/end", { reason: 'abandoned' })
    assert_response :success
    assert_equal 'completed', TourHistory.find(visit_id).tour_state, 'the end is idempotent'
    rows = connect_rows
    assert_equal 'completed', rows[@ann.id]['status']

    late = SchedualTour.create!(community_id: @community.id, tour_user_id: @bob.id, tour_date: @now.to_date, tour_time: (@now - 3.hours).strftime('%H:%M'), tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    start_visit({ client_visit_id: SecureRandom.uuid, booking_id: late.id }, auth(@bob_token))
    assert_response :unprocessable_entity
    assert_equal 'outside_window', body['error']['code']
    assert_equal 15, body['error']['details']['grace_minutes']
    start_visit({ client_visit_id: SecureRandom.uuid, booking_id: on_time.id }, auth(@bob_token))
    assert_response :not_found, "another visitor's booking is not Bob's"
  end

  test 'the booking in its window is linked without being named' do
    SchedualTour.create!(community_id: @community.id, tour_user_id: @ann.id, tour_date: @now.to_date, tour_time: (@now + 5.minutes).strftime('%H:%M'), tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    start_visit
    assert_response :created, response.body
    assert body['visit']['booking_id']
  end

  test 'stop and door events land in visited_stops and lock_histories, duplicates are acknowledged, bad stops rejected' do
    start_visit
    visit_id = body['visit']['id']
    at = (@now - 2.minutes).iso8601
    e1 = SecureRandom.uuid
    e2 = SecureRandom.uuid
    events(visit_id, [
             { client_event_id: e1, kind: 'arrived', stop_id: @u101, occurred_at: at, payload: { code: '123456' } },
             { client_event_id: e2, kind: 'note', stop_id: @u101, occurred_at: at, payload: { text: 'Nice light' } },
             { client_event_id: SecureRandom.uuid, kind: 'unlocked', stop_id: @u101, occurred_at: at, payload: { provider: 'Igloohome', method: 'pin' } },
             { client_event_id: SecureRandom.uuid, kind: 'skipped', stop_id: @u301, occurred_at: at, payload: { reason: 'locked' } },
             { client_event_id: SecureRandom.uuid, kind: 'arrived', stop_id: 'unit:424242', occurred_at: at },
             { client_event_id: SecureRandom.uuid, kind: 'teleport', stop_id: @u101 },
             { kind: 'heartbeat' }
           ])
    assert_response :multi_status, response.body
    assert_equal 5, body['accepted'].size
    assert_equal 2, body['rejected'].size
    assert_equal %w[invalid_stop validation_error], body['rejected'].map { |r| r['code'] }
    arrived = VisitedStop.find_by(tour_history_id: visit_id, client_event_id: e1)
    assert_equal ['arrived', '123456', tour_stops(:unit_stop).id, 'unit', @ann.id, 'pixel-7'], [arrived.kind, arrived.stop_pin, arrived.tour_stop_id, arrived.stop_type, arrived.tour_user_id, arrived.device_id]
    assert_equal TourHistory.find(visit_id).tour_key, arrived.tour_key
    assert_equal (@now - 2.minutes).in_time_zone(@zone).to_date, arrived.event_date
    assert_equal (@now - 2.minutes).in_time_zone(@zone).strftime('%H:%M'), arrived.event_time.strftime('%H:%M')
    note = VisitedStop.find_by(client_event_id: e2)
    assert_equal ['note', 'Nice light', nil], [note.kind, note.description, note.stop_pin]
    assert_equal ['skipped'], VisitedStop.where(tour_history_id: visit_id, kind: 'skipped').pluck(:kind)
    door = LockHistory.find_by(tour_history_id: visit_id)
    assert_equal ['unlocked', 'Igloohome', 'pin', true, @unit101.id, 'unit', @ann.id], [door.event, door.provider, door.method, door.success, door.stop_id, door.stop_type, door.tour_user_id]

    events(visit_id, [{ client_event_id: e1, kind: 'arrived', stop_id: @u101, occurred_at: at, payload: { code: '999999' } }])
    assert_response :success
    assert body['accepted'][0]['duplicate']
    assert_equal arrived.id, body['accepted'][0]['id']
    assert_equal '123456', arrived.reload.stop_pin, 'a replay never rewrites the row'
    assert_equal 3, VisitedStop.where(tour_history_id: visit_id).count
  end

  test 'a visitor cannot see or drive another visitor\'s visit, nor a visit through another property' do
    start_visit
    visit_id = body['visit']['id']
    get "#{@base}/visits/#{visit_id}", headers: auth(@bob_token)
    assert_response :not_found
    events(visit_id, [{ kind: 'heartbeat' }], auth(@bob_token))
    assert_response :not_found
    post_json("#{@base}/visits/#{visit_id}/end", { reason: 'completed' }, auth(@bob_token))
    assert_response :not_found
    assert_nil TourHistory.find(visit_id).left
    other = communities(:sitemap_property)
    get "#{BASE}/properties/#{other.id}/visits/#{visit_id}", headers: auth
    assert_includes [404, 422], response.status
    get "#{@base}/visits/#{visit_id}", headers: auth
    assert_response :success
    get "#{@base}/visits/#{visit_id}", headers: auth(@staff)
    assert_response :success, 'staff read any visit of the property'
  end

  test 'staff start a visit on behalf of a visitor of the property, never of a stranger' do
    start_visit({ tour_user_id: @ann.id }, auth(@staff))
    assert_response :not_found, 'Ann has no booking or visit here yet'
    start_visit({}, auth(@staff))
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
    SchedualTour.create!(community_id: @community.id, tour_user_id: @ann.id, tour_date: @now.to_date + 2, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    start_visit({ tour_user_id: @ann.id }, auth(@staff))
    assert_response :created, response.body
    assert_equal @ann.id, TourHistory.find(body['visit']['id']).tour_user_id
    assert PaperTrail::Version.where(event: 'visit_started', whodunnit: users(:super_admin).id.to_s).exists?
  end

  test 'a door code needs an open visit for a visitor, and outside visiting hours the visit is remote' do
    post_json("#{@base}/locks/pin", { stop_id: @u101 })
    assert_response :unprocessable_entity
    assert_equal 'visit_required', body['error']['code']
    post_json("#{@base}/locks/pin", { stop_id: @u101, visit_id: 424242 })
    assert_response :not_found

    OpeningHour.where(community_id: @community.id).delete_all
    start_visit
    assert_response :created
    assert_equal ['virtual_tour', 'offsite', false], [body['visit']['tour_type'], body['visit']['tour_site'], body['visit']['in_hours']]
  end

  test 'a verified-ID property reports verification_required until the visitor is verified' do
    @tour.update_columns(visual_id_verification: true)
    start_visit
    assert_response :created
    assert body['visit']['verification_required']
    @ann.update_columns(is_checkpoint_verified: true, checkpoint_verified_at: 2.days.ago)
    get "#{@base}/visits/#{body['visit']['id']}", headers: auth
    refute body['visit']['verification_required']
  end

  test 'the check-in records the fix and verifies a visitor inside the radius, which announces the arrival' do
    ActionMailer::Base.deliveries.clear
    start_visit
    assert_response :created, response.body
    visit = body['visit']
    assert_equal ['verified', true, true, 20], [visit['proximity'], visit['within_radius'], visit['location_received'], visit['accuracy_m']]
    assert_in_delta 300, visit['distance_m'], 20
    assert visit['server_time']
    assert_in_delta Time.now.to_f, Time.iso8601(visit['server_time']).to_f, 5
    row = TourHistory.find(visit['id'])
    assert_equal ['verified', 20, true], [row.proximity, row.accuracy_m, row.location_received]
    assert_in_delta @now.to_f, row.fix_at.to_f, 1
    assert_in_delta 39.7419, row.latitude.to_f, 0.0001
    assert_in_delta 39.7419, @ann.reload.latitude.to_f, 0.0001, 'the visitor row carries the fix as user_tour_status did'
    assert_equal 1, arrival_mails.size, 'a verified in-person check-in tells the property'
    assert_equal ['leasing@example.test'], arrival_mails.first.to
  end

  test 'a fix outside the radius refuses an in-person check-in on every property, never a staff one' do
    ActionMailer::Base.deliveries.clear
    refute @tour.only_scheduled_tour
    start_visit(AT_3_KM)
    assert_response :unprocessable_entity, response.body
    assert_equal 'outside_property', body['error']['code']
    assert_equal ['outside', 20, 1], body['error']['details'].values_at('proximity', 'accuracy_m', 'radius_km')
    assert_in_delta 3000, body['error']['details']['distance_m'], 50
    assert_equal 0, TourHistory.where(tour_user_id: @ann.id).count
    assert_empty arrival_mails

    start_visit(AT_3_KM.merge(tour_type: 'guided_tour', client_visit_id: SecureRandom.uuid))
    assert_equal 'outside_property', body['error']['code'], 'a guided tour is in person too'

    SchedualTour.create!(community_id: @community.id, tour_user_id: @ann.id, tour_date: @now.to_date + 2, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    start_visit(AT_3_KM.merge(tour_user_id: @ann.id, client_visit_id: SecureRandom.uuid), auth(@staff))
    assert_response :created, 'staff check a visitor in from anywhere'
    assert_equal ['outside', false], [body['visit']['proximity'], body['visit']['within_radius']]
    assert_equal 'outside', TourHistory.find(body['visit']['id']).proximity
  end

  test 'without a fix the check-in is refused while a location is required, and recorded as unverified while it is not' do
    ActionMailer::Base.deliveries.clear
    with_location_required('on') do
      get "#{BASE}/health"
      assert body['capabilities']['location_required']
      assert body['server_time']
      start_visit_without_fix
      assert_response :unprocessable_entity, response.body
      assert_equal 'location_unverified', body['error']['code']
      assert_equal ['unverified_no_fix', nil, 150], body['error']['details'].values_at('proximity', 'distance_m', 'accuracy_gate_m')
      assert_match(/could not confirm your location/, body['error']['message'])
      assert_equal 0, TourHistory.where(tour_user_id: @ann.id).count
    end

    with_location_required('off') do
      get "#{BASE}/health"
      refute body['capabilities']['location_required']
      start_visit_without_fix
      assert_response :created, response.body
      visit = body['visit']
      assert_equal 'unverified_no_fix', visit['proximity']
      refute visit.key?('within_radius'), 'nothing was verified either way'
      refute visit['location_received']
      assert_nil visit['distance_m']
      assert_equal 'unverified_no_fix', TourHistory.find(visit['id']).proximity
      assert_empty arrival_mails, 'an unverified in-person check-in does not announce an arrival'
    end
  end

  test 'a coarse fix verifies only when its error circle settles the question' do
    with_location_required('on') do
      start_visit(AT_800_M.merge(accuracy_m: 400))
      assert_response :unprocessable_entity, response.body
      assert_equal ['location_unverified', 'unverified_poor_accuracy'], [body['error']['code'], body['error']['details']['proximity']]
      assert_match(/not accurate enough/, body['error']['message'])
      start_visit(AT_20_KM.merge(accuracy_m: 5000))
      assert_equal 'outside_property', body['error']['code'], '20 km away is outside whatever the circle'
      start_visit(NEAR.merge(accuracy_m: 400))
      assert_response :created, '300 m away with a 400 m circle still lies within 1 km'
      assert_equal ['verified', 400], [body['visit']['proximity'], body['visit']['accuracy_m']]
    end
    with_location_required('off') do
      start_visit(AT_800_M.merge(accuracy_m: 400, client_visit_id: SecureRandom.uuid), auth(@bob_token))
      assert_response :created, response.body
      assert_equal 'unverified_poor_accuracy', body['visit']['proximity']
      refute body['visit'].key?('within_radius')
    end
  end

  test 'a property without coordinates cannot verify anyone and says so' do
    @community.update_columns(latitude: nil, longitude: nil)
    with_location_required('on') do
      start_visit
      assert_response :unprocessable_entity, response.body
      assert_equal ['location_unverified', 'unverified_no_property_coords'], [body['error']['code'], body['error']['details']['proximity']]
      assert_match(/not available at this property yet/, body['error']['message'])
    end
    with_location_required('off') do
      start_visit
      assert_response :created
      assert_equal 'unverified_no_property_coords', body['visit']['proximity']
    end
  end

  test 'outside visiting hours the visit is virtual whatever the fix, and still announces' do
    ActionMailer::Base.deliveries.clear
    OpeningHour.where(community_id: @community.id).delete_all
    with_location_required('on') do
      start_visit(AT_3_KM)
      assert_response :created, response.body
      assert_equal ['virtual_tour', 'offsite', false, 'outside', false], body['visit'].values_at('tour_type', 'tour_site', 'in_hours', 'proximity', 'within_radius')
      assert_equal 1, arrival_mails.size
    end
  end

  test 'a reuse answers the new fix but keeps the check-in verdict, and fills a row that had none' do
    start_visit
    assert_response :created
    id = body['visit']['id']
    start_visit(AT_3_KM)
    assert_response :success, 'the open visit is reused, never refused'
    assert_equal [id, 'outside', false], [body['visit']['id'], body['visit']['proximity'], body['visit']['within_radius']]
    assert_equal 'verified', TourHistory.find(id).proximity, 'the arrival record stands'

    with_location_required('off') do
      start_visit_without_fix({ client_visit_id: SecureRandom.uuid }, auth(@bob_token))
      assert_response :created
      bob_id = body['visit']['id']
      start_visit({ client_visit_id: SecureRandom.uuid }, auth(@bob_token))
      assert_response :success
      assert_equal [bob_id, 'verified'], [body['visit']['id'], body['visit']['proximity']]
      row = TourHistory.find(bob_id)
      assert_equal ['verified', true, 20], [row.proximity, row.location_received, row.accuracy_m]
    end
  end

  test 'a bad accuracy or fix time is a validation error' do
    start_visit(accuracy_m: 'near')
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
    assert_equal %w[body accuracy_m], body['error']['details'].first['loc']
    start_visit(fix_at: 'yesterday')
    assert_equal %w[body fix_at], body['error']['details'].first['loc']
    start_visit(accuracy_m: -5)
    assert_equal 'validation_error', body['error']['code']
  end

  # Fixes during a visit (`location` events), `minutes` ago.
  def location(lat, lng, minutes, accuracy = 20, id: SecureRandom.uuid)
    { client_event_id: id, kind: 'location', occurred_at: (@now - minutes.minutes).iso8601, payload: { lat: lat, lng: lng, accuracy_m: accuracy } }
  end

  def presence_of(visit_id, list, headers = auth)
    events(visit_id, list, headers)
    assert_response :success, response.body
    body['accepted'].map { |a| a['presence'] }
  end

  def departure_mails
    ActionMailer::Base.deliveries.select { |m| m.subject == 'Visitor has departed' }
  end

  test 'location events keep the presence state with hysteresis and tell the property once of a confirmed departure' do
    ActionMailer::Base.deliveries.clear
    start_visit
    id = body['visit']['id']
    far = [39.7662, -104.9903]
    assert_equal ['on_site'], presence_of(id, [location(39.7419, -104.9903, 12)])
    row = TourHistory.find(id)
    assert_equal ['on_site', 0], [row.presence_state, row.outside_fix_count]
    assert_in_delta 300, row.last_fix_distance_m, 20

    assert_equal ['leaving'], presence_of(id, [location(*far, 11)]), 'one reading beyond the radius proves nothing yet'
    assert_equal 1, TourHistory.find(id).outside_fix_count
    assert_equal ['on_site'], presence_of(id, [location(39.7419, -104.9903, 10)]), 'a reading inside resets the count'
    assert_equal [0, nil], TourHistory.find(id).values_at(:outside_fix_count, :outside_since)
    assert_empty departure_mails

    assert_equal %w[leaving leaving], presence_of(id, [location(*far, 9), location(*far, 7)]), 'two readings over two minutes are not five minutes'
    assert_equal ['departed'], presence_of(id, [location(*far, 3)])
    row = TourHistory.find(id)
    assert_equal ['away', 3], [row.presence_state, row.outside_fix_count]
    assert row.departed_notified_at
    assert_equal 1, departure_mails.size
    assert_equal ['leasing@example.test'], departure_mails.first.to
    assert_match(/Ann Lee has left/, departure_mails.first.body.encoded)
    assert PaperTrail::Version.where(event: 'visit_departed').exists?

    assert_equal ['away'], presence_of(id, [location(*far, 2)])
    assert_equal 1, departure_mails.size, 'the property is told once'
    get "#{@base}/visits/#{id}", headers: auth
    presence = body['visit']['presence']
    assert_equal 'away', presence['state']
    assert presence['departed_at']
    assert_in_delta 3000, presence['distance_m'], 50

    assert_equal ['returned'], presence_of(id, [location(39.7419, -104.9903, 1)])
    row = TourHistory.find(id)
    assert_equal 'on_site', row.presence_state
    assert row.returned_at
    assert_equal 1, departure_mails.size, 'a return sends nothing'
    assert_equal %w[leaving leaving departed], presence_of(id, [location(*far, 0.8), location(*far, 0.4), location(*far, -4.5)]), 'a second confirmed departure (the last reading is within the five minutes a clock may run ahead)'
    assert_equal 1, departure_mails.size, 'and still one email per visit'
  end

  test 'a location event that is stale, out of order, repeated, too coarse or beyond the buffer only is not a departure' do
    start_visit
    id = body['visit']['id']
    assert_equal ['on_site'], presence_of(id, [location(39.7419, -104.9903, 5)])
    assert_equal ['ignored'], presence_of(id, [location(39.7662, -104.9903, 6)]), 'older than the last reading that counted'
    assert_equal ['ignored'], presence_of(id, [{ client_event_id: SecureRandom.uuid, kind: 'location', occurred_at: (@now - 20.minutes).iso8601, payload: { lat: 39.7662, lng: -104.9903 } }]), 'older than fifteen minutes'
    dup = SecureRandom.uuid
    assert_equal ['leaving'], presence_of(id, [location(39.7662, -104.9903, 4, id: dup)])
    events(id, [location(39.7662, -104.9903, 4, id: dup)])
    assert_equal [true, 'duplicate'], body['accepted'].first.values_at('duplicate', 'presence')
    assert_equal ['unverified'], presence_of(id, [location(39.7491, -104.9903, 3, 400)]), '1.1 km away with a 400 m circle places the phone nowhere'
    assert_equal ['on_site'], presence_of(id, [location(39.7491, -104.9903, 2, 20)]), '1.1 km away is beyond the radius but within the 250 m buffer: still on site'
    row = TourHistory.find(id)
    assert_equal ['on_site', 0], [row.presence_state, row.outside_fix_count], 'the buffer reading resets the count, as any reading inside does'

    events(id, [{ client_event_id: SecureRandom.uuid, kind: 'location', occurred_at: @now.iso8601, payload: { lat: 39.7 } }])
    assert_response :multi_status
    assert_equal 'validation_error', body['rejected'].first['code']
    events(id, [{ client_event_id: SecureRandom.uuid, kind: 'heartbeat', occurred_at: @now.iso8601 }])
    assert_equal [nil, false], body['accepted'].first.values_at('presence', 'duplicate'), 'a heartbeat is unchanged'
  end

  test 'location events are dropped while presence is off, and on a virtual visit' do
    start_visit
    id = body['visit']['id']
    ENV['PYN_TOUR_PRESENCE'] = 'off'
    get "#{BASE}/health"
    refute body['capabilities']['presence']
    assert_equal ['disabled'], presence_of(id, [location(39.7662, -104.9903, 1)])
    assert_nil TourHistory.find(id).presence_state
    ENV.delete('PYN_TOUR_PRESENCE')
    get "#{BASE}/health"
    assert body['capabilities']['presence']

    OpeningHour.where(community_id: @community.id).delete_all
    start_visit({ client_visit_id: SecureRandom.uuid }, auth(@bob_token))
    assert_equal 'virtual_tour', body['visit']['tour_type']
    assert_equal ['offsite'], presence_of(body['visit']['id'], [location(39.7662, -104.9903, 1)], auth(@bob_token))
  ensure
    ENV.delete('PYN_TOUR_PRESENCE')
  end

  test 'visits are 404 while the switch is off' do
    ENV['PYN_TOUR_VISITS'] = 'off'
    start_visit
    assert_response :not_found
    assert_equal 'disabled', body['error']['code']
  ensure
    ENV.delete('PYN_TOUR_VISITS')
  end
end
