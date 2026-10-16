require 'test_helper'

class Connect::BookingControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @community.update_columns(time_zone: 'America/Chicago', scheduler_widget: true)
    @tour = tours(:main_tour)
    @setting = TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: false, time_intervel: '15 min', do_limit_max_tour: true, limit_max_tour: 5)
    @tour.update_columns(max_self_tour_users: 2, grace_period: 15)
    OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '09:00', closing_time: '12:00', sort: 1)
    OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '13:00', closing_time: '17:00', sort: 2)
    @button = @tour.create_scheduler_widget_setting(btn_text: 'Schedule a Visit')
  end

  def body
    JSON.parse(response.body)
  end

  def base
    "/communities/#{@community.id}/connect/booking"
  end

  test 'show reads the stored settings, hours, gates and link' do
    sign_in users(:community_assistant)
    get "#{base}.json"
    assert_response :success
    data = body['data']
    assert data['configured']
    assert_equal({ 'self_tour' => true, 'guided_tour' => false, 'virtual_tour' => false }, data['tour_types'])
    assert_equal 15, data['slot_interval_minutes']
    assert_equal [{ 'id' => OpeningHour.first.id, 'open' => '09:00', 'close' => '12:00' }, { 'id' => OpeningHour.last.id, 'open' => '13:00', 'close' => '17:00' }], data['hours']['self']['Monday']
    assert_equal [], data['hours']['self']['Tuesday']
    assert_equal [], data['hours']['guided']['Monday']
    assert data['gates'].all? { |g| g['ok'] }, data['gates'].inspect
    assert data['widget_live']
    assert_equal 'Schedule a Visit', data['button']['text']
    assert_equal 2, data['capacity']['max_self_tour_users']
    assert_equal 15, data['grace_period']
    assert_includes data['unavailable'], 'holidays'
    assert_equal ENV['HOST_URL'].present?, data['link']['host_configured']
  end

  test 'availability lists the stepped slots of open days with the types open at each' do
    sign_in users(:community_assistant)
    monday = Date.today.next_occurring(:monday)
    get "#{base}/availability.json", params: { date: monday.iso8601, days: 2 }
    assert_response :success
    day = body['data']['days'].first
    assert_equal monday.iso8601, day['date']
    refute day['closed']
    times = day['slots'].map { |s| s['time'] }
    assert_includes times, '09:00'
    assert_includes times, '11:45'
    refute_includes times, '12:00'
    assert_includes times, '13:00'
    assert_equal ['self_tour'], day['slots'].first['types']
    tuesday = body['data']['days'].last
    assert tuesday['closed']
    assert_equal [0, 2, 3, 4, 5, 6], body['data']['closed_weekdays']
  end

  test 'a full slot loses the type that reached its cap' do
    monday = Date.today.next_occurring(:monday)
    2.times do |i|
      user = TourUser.create!(first_name: "V#{i}", last_name: 'X', email: "v#{i}@example.test", phone_number: "+1303555010#{i}")
      SchedualTour.create!(community_id: @community.id, tour_user_id: user.id, tour_date: monday, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    end
    sign_in users(:community_assistant)
    get "#{base}/availability.json", params: { date: monday.iso8601 }
    slot = body['data']['days'].first['slots'].find { |s| s['time'] == '10:00' }
    assert_equal [], slot['types']
    assert_equal ['self_tour'], slot['full']
    # The widget's window is slot ± (interval − 1) minutes, so 10:15 does not count the 10:00 bookings.
    assert_equal [], body['data']['days'].first['slots'].find { |s| s['time'] == '10:15' }['full']
    assert_equal ['self_tour'], body['data']['days'].first['slots'].find { |s| s['time'] == '10:30' }['types']
  end

  test 'rules are validated and written to the legacy columns' do
    sign_in users(:community_manager)
    put "#{base}/rules.json", as: :json, params: { allow_guided_tour: true, slot_interval_minutes: 30, grace_period: 20, only_scheduled_tour: true, max_guided_tour_users: 3, scheduler_enabled: false, length_stay_limit: 60 }
    assert_response :success, response.body
    @setting.reload
    @tour.reload
    assert_equal [true, '30 min', 60], [@setting.allow_guided_tour, @setting.time_intervel, @setting.length_stay_limit]
    assert_equal [20, true, 3], [@tour.grace_period, @tour.only_scheduled_tour, @tour.max_guided_tour_users]
    assert_equal false, @community.reload.scheduler_widget
    refute body['data']['widget_live']
    assert_equal 'Scheduler is Disabled', body['data']['link']['reasons'].first

    put "#{base}/rules.json", as: :json, params: { grace_period: 5, slot_interval_minutes: 45 }
    assert_response :unprocessable_entity
    assert_equal %w[grace_period slot_interval_minutes], body['errors'].map { |e| e['path'] }.sort
    assert_equal 20, @tour.reload.grace_period
  end

  test 'hours are validated and replaced per lane' do
    sign_in users(:community_admin)
    put "#{base}/hours.json", as: :json, params: { hours: { guided: { 'Monday' => [{ open: '10:00', close: '12:00' }], 'Saturday' => [{ open: '10:00', close: '14:00' }] } } }
    assert_response :success, response.body
    assert_equal 2, GuidedOpeningHour.where(community_id: @community.id).count
    assert_equal 2, OpeningHour.where(community_id: @community.id).count, 'the self lane is untouched'
    assert_equal [{ 'id' => GuidedOpeningHour.first.id, 'open' => '10:00', 'close' => '12:00' }], body['data']['hours']['guided']['Monday']

    put "#{base}/hours.json", as: :json, params: { hours: { self: { 'Monday' => [{ open: '09:00', close: '08:00' }], 'Tuesday' => [{ open: '09:00', close: '12:00' }, { open: '11:00', close: '13:00' }] } } }
    assert_response :unprocessable_entity
    codes = body['errors'].map { |e| [e['path'], e['code']] }
    assert_includes codes, ['self.Monday[0]', 'invalid']
    assert_includes codes, ['self.Tuesday', 'overlap']
    assert_equal 2, OpeningHour.where(community_id: @community.id).count

    put "#{base}/hours.json", as: :json, params: { hours: { self: {} } }
    assert_response :success
    assert_equal 0, OpeningHour.where(community_id: @community.id).count, 'an empty lane closes every day'
    assert body['data']['gates'].all? { |g| g['ok'] }
  end

  test 'the booking form settings and the button are written and validated' do
    sign_in users(:community_admin)
    put "#{base}/form.json", as: :json, params: { credit_card_required: true, show_desired_bedroom: true, id_verification_fee: true, button: { text: 'Book a tour', color: '#0077AE', width: 160 } }
    assert_response :success, response.body
    assert_equal [true, true], [@tour.reload.credit_card_required, @setting.reload.show_desired_bedroom]
    assert @setting.charge_user_for_id_verfication
    assert_equal ['Book a tour', '#0077ae', 160], [@button.reload.btn_text, @button.btn_color, @button.btn_width]
    put "#{base}/form.json", as: :json, params: { marketing_source_required: true }
    assert_response :unprocessable_entity, 'only RealPage properties can require a marketing source'
    put "#{base}/form.json", as: :json, params: { button: { color: 'blue', width: 2 } }
    assert_response :unprocessable_entity
    assert_equal %w[button.color button.width], body['errors'].map { |e| e['path'] }.sort
  end

  test 'writes are refused to read-only roles and other companies' do
    sign_in users(:community_assistant)
    put "#{base}/rules.json", as: :json, params: { allow_guided_tour: true }
    assert_response :forbidden
    sign_in users(:other_company_admin)
    get "#{base}.json"
    assert_response :not_found
  end
end
