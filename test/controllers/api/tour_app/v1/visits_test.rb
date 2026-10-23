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

  def start_visit(payload = {}, headers = auth)
    post_json("#{@base}/visits", { client_visit_id: @uuid, tour_type: 'self_tour', device_time_zone: 'America/Denver', app_version: '2.1.0' }.merge(payload), headers)
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

  test 'visits are 404 while the switch is off' do
    ENV['PYN_TOUR_VISITS'] = 'off'
    start_visit
    assert_response :not_found
    assert_equal 'disabled', body['error']['code']
  ensure
    ENV.delete('PYN_TOUR_VISITS')
  end
end
