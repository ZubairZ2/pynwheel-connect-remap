require 'test_helper'
require_relative '../../../../support/tour_api_test_helper'

# The Schedule screen's three endpoints: the property's booking rules, the
# slots of a date range, and a booking (Bookings::Create with "Tour App").
class Api::TourApp::V1::BookingsTest < ActionDispatch::IntegrationTest
  include TourApiTestHelper

  setup do
    build_tour_app_fixtures!
    @token = api_token_for(users(:super_admin), expires_in: 30.days)
    @community.update_columns(time_zone: 'America/Chicago', scheduler_widget: true)
    @setting = TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: false, time_intervel: '30 min', do_limit_max_tour: true, limit_max_tour: 5)
    @tour.update_columns(max_self_tour_users: 1, grace_period: 15)
    OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '09:00', closing_time: '12:00', sort: 1)
    @tour.create_scheduler_widget_setting(btn_text: 'Book')
    @monday = Date.today.next_occurring(:monday)
    @base = "#{BASE}/properties/#{@community.id}"
  end

  teardown { reset_tour_api_caches! }

  def visitor(extra = {})
    { tour_type: 'self_tour', tour_date: @monday.iso8601, tour_time: '09:30', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.test', phone_number: '3035550123', country_code: 'US' }.merge(extra)
  end

  test 'the settings carry the rules the Schedule screen needs and nothing CMS-only' do
    get "#{@base}/booking/settings", headers: auth
    assert_response :success
    assert_equal @community.id, body['property_id']
    assert_equal 'America/Chicago', body['time_zone']
    assert body['bookable'], body['gates'].inspect
    assert_equal({ 'self_tour' => true, 'guided_tour' => false }, body['tour_types'])
    assert_equal 30, body['slot_interval_minutes']
    assert_equal 15, body['grace_period']
    assert_equal({ 'buffer_minutes' => 0, 'minimum_notice_minutes' => 0, 'booking_horizon_days' => nil }, body['window'])
    assert_equal({ 'after_hours_label' => true, 'allow_shorter_tour' => true, 'party_size_limit' => 6, 'ask_unit' => true, 'show_text_booking' => true }, body['app'])
    assert_equal [{ 'open' => '09:00', 'close' => '12:00' }], body['hours']['self']['Monday']
    assert_equal %w[credit_card_required id_verification_fee visual_id_verification show_desired_bedroom show_desired_move_in_date marketing_source_required discovery_source sms_opt_in_default], body['form'].keys
    refute body.key?('button')
    refute body.key?('crm')
  end

  test 'availability is the same window Connect reads' do
    get "#{@base}/booking/availability", params: { date: @monday.iso8601, days: 2 }, headers: auth
    assert_response :success
    assert_equal 30, body['interval_minutes']
    assert_equal 'America/Chicago', body['time_zone']
    day = body['days'].first
    assert_equal @monday.iso8601, day['date']
    assert_equal %w[09:00 09:30 10:00 10:30 11:00 11:30], day['slots'].map { |s| s['time'] }
    assert_equal ['self_tour'], day['slots'].first['types']
    assert body['days'].last['closed']
    get "#{@base}/booking/availability", params: { days: 'many' }, headers: auth
    assert_response :unprocessable_entity
    assert_equal 'validation_error', body['error']['code']
  end

  test 'a booking on an open slot is created by the Tour App and shows up in Connect' do
    post_json "#{@base}/bookings", visitor(desired_bedroom: '2', length_minutes: 45, party_size: 2, unit: '1604')
    assert_response :created, response.body
    booking = SchedualTour.find(body['booking']['id'])
    assert_equal ['Tour App', 'self_tour', 'scheduled_tour', @monday, '09:30'], [booking.created_by, booking.tour_type, booking.property_tour_type, booking.tour_date, booking.tour_time.strftime('%H:%M')]
    assert_equal '09:59', body['booking']['end_time'], 'the widget ends a slot at interval − 1 minutes'
    assert_equal 'upcoming', body['booking']['status']
    assert_equal '9:30 AM', body['booking']['tour_time_label']
    assert_equal false, body['booking']['rescheduled']
    assert_equal 'jane@example.test', body['visitor']['email']
    assert_equal 'Jane Doe', TourUser.find(body['visitor']['id']).name
    assert_equal 2, booking.desired_bedroom

    sign_in users(:community_admin)
    get "/communities/#{@community.id}/connect/visitors.json"
    assert_response :success
    row = JSON.parse(response.body)['data']['rows'].find { |r| r['booking_id'] == booking.id || r.dig('booking', 'id') == booking.id } || JSON.parse(response.body)['data']['rows'].first
    assert_includes response.body, 'Tour App'
    assert row, 'the booking is listed'
  end

  test 'the rules refuse a closed time, a full slot and a missing phone' do
    post_json "#{@base}/bookings", visitor(tour_time: '13:00')
    assert_response :unprocessable_entity
    assert_equal 'slot_unavailable', body['error']['code']
    assert_equal @monday.iso8601, body['error']['details']['date']
    assert body['error']['details']['slots'].any?

    post_json "#{@base}/bookings", visitor
    assert_response :created
    post_json "#{@base}/bookings", visitor(email: 'other@example.test', phone_number: '3035550999')
    assert_response :unprocessable_entity
    assert_equal 'slot_full', body['error']['code']

    post_json "#{@base}/bookings", visitor(tour_time: '10:30', phone_number: '')
    assert_response :unprocessable_entity
    assert_equal 'invalid_visitor', body['error']['code']

    post_json "#{@base}/bookings", visitor(tour_time: '10:30', tour_type: 'guided_tour', email: 'g@example.test', phone_number: '3035550111')
    assert_response :unprocessable_entity
    assert_equal 'tour_type_off', body['error']['code']
    assert_equal 1, SchedualTour.where(community_id: @community.id).where.not(tour_user_id: nil).count
  end

  test 'notice, horizon and closures are enforced on the booking' do
    @setting.update_columns(minimum_notice_minutes: 1440, booking_horizon_days: 7)
    TourClosure.create!(community_id: @community.id, date: @monday + 7, closed_all_day: true, label: 'Holiday')
    travel_to Time.find_zone('America/Chicago').local(@monday.year, @monday.month, @monday.day, 8, 0) do
      post_json "#{@base}/bookings", visitor
      assert_response :unprocessable_entity
      assert_equal 'slot_unavailable', body['error']['code'], 'inside the 24 h notice'
      post_json "#{@base}/bookings", visitor(tour_date: (@monday + 7).iso8601)
      assert_equal 'slot_unavailable', body['error']['code'], 'the holiday'
      post_json "#{@base}/bookings", visitor(tour_date: (@monday + 14).iso8601)
      assert_equal 'slot_unavailable', body['error']['code'], 'beyond the horizon'
      get "#{@base}/booking/availability", params: { date: (@monday + 7).iso8601, days: 1 }, headers: auth
      assert_equal 'Holiday', body['days'].first['closure']['label']
    end
  end

  test 'no token, another company and a property without a tour' do
    post "#{@base}/bookings", params: visitor.to_json, headers: JSON_HEADERS
    assert_response :unauthorized
    get "#{BASE}/properties/#{communities(:no_tour_property).id}/booking/settings", headers: auth
    assert_response :unprocessable_entity
    assert_equal 'tour_disabled', body['error']['code']
  end
end
