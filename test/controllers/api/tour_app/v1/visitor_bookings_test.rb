require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

# A signed-in visitor's bookings on the Tour App API (October 23, 2026):
# booking as themselves, listing, moving and cancelling their own and only
# their own, through the same services Connect and the widget use.
class Api::TourApp::V1::VisitorBookingsTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper
  include TourApiJobsStub

  setup do
    fake_jobs!
    build_tour_app_fixtures!
    @community.update_columns(time_zone: 'America/Chicago', scheduler_widget: true, email: 'leasing@example.test', alert_contact: 2)
    TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: false, time_intervel: '30 min', do_limit_max_tour: true, limit_max_tour: 5)
    @tour.update_columns(max_self_tour_users: 1, grace_period: 15)
    OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '09:00', closing_time: '12:00', sort: 1)
    @tour.create_scheduler_widget_setting(btn_text: 'Book')
    @monday = Date.today.next_occurring(:monday)
    @ann = TourUser.create!(first_name: 'Ann', last_name: 'Lee', name: 'Ann Lee', email: 'ann@example.test', phone_number: '+13035550101')
    @bob = TourUser.create!(first_name: 'Bob', last_name: 'Ray', name: 'Bob Ray', email: 'bob@example.test', phone_number: '+13035550102')
    @token, = Visitors::Session.issue!(@ann)
    @bob_token, = Visitors::Session.issue!(@bob)
    @staff = api_token_for(users(:super_admin))
  end

  teardown do
    restore_jobs!
    reset_tour_api_caches!
  end

  def slot(extra = {})
    { tour_type: 'self_tour', tour_date: @monday.iso8601, tour_time: '09:30' }.merge(extra)
  end

  test 'a visitor books as themselves: the form identity is ignored and the booking is theirs' do
    post_json "#{@base}/bookings", slot(first_name: 'Mallory', last_name: 'X', email: 'mallory@example.test', phone_number: '3035550999', desired_bedroom: '2')
    assert_response :created, response.body
    booking = SchedualTour.find(body['booking']['id'])
    assert_equal [@ann.id, 'Tour App', 'self_tour', 2], [booking.tour_user_id, booking.created_by, booking.tour_type, booking.desired_bedroom]
    assert_equal ['Ann', 'ann@example.test', '+13035550101'], [@ann.reload.first_name, @ann.email, @ann.phone_number]
    assert_equal 0, TourUser.where(email: 'mallory@example.test').count
    assert_equal @ann.id, body['visitor']['id']
    version = PaperTrail::Version.where(item_type: 'SchedualTour', item_id: booking.id, event: 'booking_created').order(:created_at).to_a.last
    assert_equal "visitor:#{@ann.id}", version.whodunnit

    get "#{@base}/bookings", headers: auth
    assert_response :success
    assert_equal [booking.id], body['bookings'].map { |b| b['id'] }
    assert_equal 'upcoming', body['bookings'][0]['status']
    get "#{@base}/bookings", headers: auth(@bob_token)
    assert_equal [], body['bookings']
    get "#{@base}/bookings", headers: auth(@staff)
    assert_response :forbidden
    assert_equal 'visitor_only', body['error']['code']
  end

  test 'the last place in a slot cannot be taken twice' do
    post_json "#{@base}/bookings", slot
    assert_response :created, response.body
    post_json "#{@base}/bookings", slot, auth(@bob_token)
    assert_response :unprocessable_entity
    assert_equal 'slot_full', body['error']['code']
  end

  test 'a visitor moves and cancels their own booking only; the cancel leaves the version Connect reads' do
    post_json "#{@base}/bookings", slot
    booking_id = body['booking']['id']
    put "#{@base}/bookings/#{booking_id}", params: { tour_date: @monday.iso8601, tour_time: '10:00' }.to_json, headers: auth(@bob_token).merge(JSON_HEADERS)
    assert_response :not_found
    put "#{@base}/bookings/#{booking_id}", params: { tour_date: @monday.iso8601, tour_time: '10:00' }.to_json, headers: auth.merge(JSON_HEADERS)
    assert_response :success, response.body
    assert_equal '10:00', body['booking']['tour_time']
    assert_equal '10:00', SchedualTour.find(booking_id).tour_time.strftime('%H:%M')

    delete "#{@base}/bookings/#{booking_id}", headers: auth(@bob_token)
    assert_response :not_found
    assert SchedualTour.exists?(booking_id)
    delete "#{@base}/bookings/#{booking_id}", headers: auth
    assert_response :success
    assert_nil SchedualTour.find_by(id: booking_id)
    assert PaperTrail::Version.where(item_type: 'SchedualTour', item_id: booking_id, event: 'destroy').exists?
    audit = PaperTrail::Version.where(item_type: 'Community', event: 'booking_cancelled').order(:created_at).to_a.last
    assert_equal "visitor:#{@ann.id}", audit.whodunnit
    assert_equal({ 'booking_id' => booking_id, 'tour_user_id' => @ann.id, 'source' => 'tour_app' }, JSON.parse(audit.object))
    delete "#{@base}/bookings/#{booking_id}", headers: auth
    assert_response :not_found
    assert_equal 1, Visitors::Cancelled.for(@community, tour_user_id: @ann.id).size, 'Connect lists the cancellation'
  end

  test 'staff cancel any booking of the property and still book on behalf of a form visitor' do
    post_json "#{@base}/bookings", slot
    booking_id = body['booking']['id']
    delete "#{@base}/bookings/#{booking_id}", headers: auth(@staff)
    assert_response :success
    assert_nil SchedualTour.find_by(id: booking_id)
    post_json "#{@base}/bookings", slot(first_name: 'Jane', last_name: 'Doe', email: 'jane@example.test', phone_number: '3035550123', country_code: 'US'), auth(@staff)
    assert_response :created, response.body
    assert_equal 'Jane Doe', TourUser.find(body['visitor']['id']).name
  end
end
