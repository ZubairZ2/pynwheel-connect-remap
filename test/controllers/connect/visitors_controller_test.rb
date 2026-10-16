require 'test_helper'
require 'sidekiq/testing'

# The Connect Visitors endpoints on the wayfinding fixture property, with a
# tour setting, visiting hours, two visitors, bookings and a visit created in
# the test transaction. Sidekiq runs in fake mode: the notification jobs the
# widget would send are queued in memory and counted, never delivered.
class Connect::VisitorsControllerTest < ActionDispatch::IntegrationTest
  setup do
    Sidekiq::Testing.fake!
    Sidekiq::Worker.clear_all
    # The widget's mail goes through a SuckerPunch job that renders the legacy
    # template in-process; here the job is recorded, not run.
    @mail_jobs = []
    ScheduledTourMailerJob.singleton_class.alias_method(:perform_async_without_test, :perform_async) unless ScheduledTourMailerJob.respond_to?(:perform_async_without_test)
    jobs = @mail_jobs
    ScheduledTourMailerJob.define_singleton_method(:perform_async) { |*args| jobs << args; true }
    @community = communities(:tour_property)
    @community.update_columns(time_zone: 'America/Denver', email: 'leasing@example.test', alert_contact: 2, scheduler_widget: true)
    @tour = tours(:main_tour)
    @tour.update_columns(grace_period: 10, credit_card_required: false)
    @setting = TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: true, time_intervel: '30 min', length_stay_limit: 45, do_limit_max_tour: false)
    %w[Monday Tuesday Wednesday Thursday Friday Saturday Sunday].each_with_index do |day, i|
      OpeningHour.create!(community_id: @community.id, day: day, opening_time: '09:00', closing_time: '17:00', sort: i + 1)
      GuidedOpeningHour.create!(community_id: @community.id, day: day, opening_time: '10:00', closing_time: '12:00', sort: i + 1)
    end
    @zone = ActiveSupport::TimeZone['America/Denver']
    @now = Time.now.in_time_zone(@zone)
    @ann = TourUser.create!(first_name: 'Ann', last_name: 'Lee', name: 'Ann Lee', email: 'ann@example.test', phone_number: '+13035550101')
    @bob = TourUser.create!(first_name: 'Bob', last_name: 'Ray', name: 'Bob Ray', email: 'bob@example.test', phone_number: '+13035550102')
    @upcoming = SchedualTour.create!(community_id: @community.id, tour_user_id: @ann.id, tour_date: @now.to_date + 2, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour', created_by: 'Pynwheel')
    @missed = SchedualTour.create!(community_id: @community.id, tour_user_id: @bob.id, tour_date: @now.to_date - 3, tour_time: '10:00', tour_type: 'guided_tour', property_tour_type: 'scheduled_tour', created_by: 'PERQ')
    @visit = TourHistory.create!(tour_user: @bob, tour_id: @tour.id, community_id: @community.id, arrived: @now - 30.minutes, active_app: true, tour_key: 'key-bob', tour_site: 'onsite', tour_status: 'self_tour')
  end

  teardown do
    ScheduledTourMailerJob.singleton_class.alias_method(:perform_async, :perform_async_without_test) if ScheduledTourMailerJob.respond_to?(:perform_async_without_test)
  end

  def body
    JSON.parse(response.body)
  end

  def base
    "/communities/#{@community.id}/connect/visitors"
  end

  test 'the list derives statuses, counts and the on-site visitors from the rows' do
    sign_in users(:community_assistant)
    get "#{base}.json"
    assert_response :success
    data = body['data']
    rows = data['rows'].index_by { |r| r['id'] }
    assert_equal 'upcoming', rows[@ann.id]['status']
    assert_equal 'in_progress', rows[@bob.id]['status'], 'an active visit wins over a missed booking'
    assert_equal 'Booking form', rows[@ann.id]['source']
    assert_equal 'PERQ', rows[@bob.id]['source']
    assert_equal 'self', rows[@ann.id]['type']
    assert_equal 'Never verified', rows[@ann.id]['id_check']['label']
    assert_equal({ 'all' => 2, 'upcoming' => 1, 'in_progress' => 1, 'completed' => 0, 'missed' => 0, 'cancelled' => 0 }, data['counts'])
    assert_equal 1, data['on_site'].size
    assert_equal @bob.id, data['on_site'].first['id']
    assert_equal 'America/Denver', data['time_zone']

    get "#{base}.json", params: { status: 'upcoming' }
    assert_equal [@ann.id], body['data']['rows'].map { |r| r['id'] }
    get "#{base}.json", params: { q: 'bob' }
    assert_equal [@bob.id], body['data']['rows'].map { |r| r['id'] }
    get "#{base}.json", params: { type: 'guided' }
    assert_equal [@bob.id], body['data']['rows'].map { |r| r['id'] }
    get "#{base}.json", params: { range: 'next7' }
    assert_equal 2, body['data']['rows'].size
  end

  test 'a missed booking without a visit is missed, and a cancelled one comes back from its version' do
    @visit.destroy
    sign_in users(:community_admin)
    get "#{base}.json"
    assert_equal 'missed', body['data']['rows'].find { |r| r['id'] == @bob.id }['status']

    delete "#{base}/bookings/#{@upcoming.id}.json", as: :json
    assert_response :success
    assert_nil SchedualTour.find_by(id: @upcoming.id)
    get "#{base}.json", params: { status: 'cancelled' }
    assert_equal [@ann.id], body['data']['rows'].map { |r| r['id'] }
    get "#{base}/#{@ann.id}.json"
    assert_response :success
    cancelled = body['data']['bookings'].find { |b| b['status'] == 'cancelled' }
    assert cancelled['cancelled_at'].present?
  end

  test 'the profile shows bookings, the visit session and its stops' do
    VisitedStop.create!(tour_user_id: @bob.id, tour_id: @tour.id, tour_stop_id: tour_stops(:unit_stop).id, tour_key: 'key-bob', event_time: @now - 20.minutes, stop_type: 'unit')
    sign_in users(:community_assistant)
    get "#{base}/#{@bob.id}.json"
    assert_response :success
    data = body['data']
    assert_equal 'Bob', data['visitor']['first_name']
    assert_equal 1, data['bookings'].size
    assert_equal 'missed', data['bookings'].first['status']
    session = data['sessions'].first
    assert_equal 'in_progress', session['status']
    assert_equal '101', session['stops'].first['name']
    assert data['timeline'].any? { |e| e['title'] == 'Tour started' }
  end

  test 'a visitor of another property is not found and other companies cannot read' do
    sign_in users(:community_admin)
    stranger = TourUser.create!(first_name: 'No', last_name: 'One', email: 'noone@example.test', phone_number: '+13035550199')
    get "#{base}/#{stranger.id}.json"
    assert_response :not_found
    sign_in users(:other_company_admin)
    get "#{base}.json"
    assert_response :not_found
  end

  test 'the CSV carries the filtered rows and no codes' do
    sign_in users(:community_admin)
    get "#{base}/export.json", params: { status: 'upcoming' }
    assert_response :success
    assert_match %r{text/csv}, response.content_type
    lines = response.body.lines
    assert_equal 'Date,Time,Last name,First name,Email,Phone,Tour type,Status,ID check,Source,Flags', lines.first.strip
    assert_equal 2, lines.size
    assert_includes lines[1], 'ann@example.test'
  end

  test 'a staff booking goes through the widget rules and notifies like the widget' do
    sign_in users(:community_manager)
    date = (@now.to_date + 3).iso8601
    post "#{base}/bookings.json", as: :json, params: { first_name: 'Cara', last_name: 'Diaz', email: 'Cara@Example.test', phone_number: '(303) 555-0103', country_code: 'US',
                                                      tour_type: 'guided_tour', property_tour_type: 'scheduled_tour', tour_date: date, tour_time: '10:30' }
    assert_response :success, response.body
    booking = SchedualTour.find(body['data']['booking_id'])
    assert_equal 'Staff', booking.created_by
    assert_equal %w[guided_tour scheduled_tour], [booking.tour_type, booking.property_tour_type]
    assert_equal '10:30', booking.tour_time.strftime('%H:%M')
    cara = booking.tour_user
    assert_equal ['cara@example.test', '+13035550103'], [cara.email, cara.phone_number]
    assert_equal false, body['data']['rescheduled']
    assert_operator @mail_jobs.size, :>=, 2, 'the visitor and the property are mailed'
    assert_equal 1, TwilioSmsWorker.jobs.size

    # The same person again: the upcoming booking is reused, as the widget does.
    post "#{base}/bookings.json", as: :json, params: { first_name: 'Cara', last_name: 'Diaz', email: 'cara@example.test', phone_number: '3035550103', country_code: 'US',
                                                      tour_type: 'self_tour', property_tour_type: 'scheduled_tour', tour_date: date, tour_time: '11:00' }
    assert_response :success, response.body
    assert body['data']['rescheduled']
    assert_equal booking.id, body['data']['booking_id']
    assert_equal 1, SchedualTour.where(tour_user_id: cara.id).count
    assert_equal '11:00', booking.reload.tour_time.strftime('%H:%M')

    # A time outside the guided hours for a guided tour is refused with the day's slots.
    post "#{base}/bookings.json", as: :json, params: { first_name: 'Dan', last_name: 'Ellis', email: 'dan@example.test', phone_number: '3035550104', country_code: 'US',
                                                      tour_type: 'guided_tour', property_tour_type: 'scheduled_tour', tour_date: date, tour_time: '15:00' }
    assert_response :unprocessable_entity
    assert_equal 'slot_unavailable', body['errors'].first['code']
    assert body['errors'].first['slots'].any?
    post "#{base}/bookings.json", as: :json, params: { first_name: 'Dan', last_name: 'Ellis', email: 'dan@example.test', phone_number: '3035550104', country_code: 'US',
                                                      tour_type: 'self_tour', property_tour_type: 'scheduled_tour', tour_date: (@now.to_date - 1).iso8601, tour_time: '10:00' }
    assert_response :unprocessable_entity
    assert_equal 'past_date', body['errors'].first['code']

    # An unscheduled visit has no slot.
    post "#{base}/bookings.json", as: :json, params: { first_name: 'Eve', last_name: 'Fox', email: 'eve@example.test', phone_number: '3035550105', country_code: 'US', property_tour_type: 'unscheduled_self_tour' }
    assert_response :success, response.body
    assert_nil SchedualTour.find(body['data']['booking_id']).tour_date
  end

  test 'reschedule moves the booking and resets its reminders' do
    sign_in users(:community_admin)
    @upcoming.update_columns(hourly_email_sent: true, daily_email_sent: true)
    date = (@now.to_date + 4).iso8601
    put "#{base}/bookings/#{@upcoming.id}/reschedule.json", as: :json, params: { tour_date: date, tour_time: '13:30' }
    assert_response :success, response.body
    @upcoming.reload
    assert_equal [date, '13:30', false, true], [@upcoming.tour_date.iso8601, @upcoming.tour_time.strftime('%H:%M'), @upcoming.hourly_email_sent, @upcoming.daily_email_sent]
    put "#{base}/bookings/#{@upcoming.id}/reschedule.json", as: :json, params: { tour_date: date, tour_time: '08:00' }
    assert_response :unprocessable_entity
    assert_equal 'slot_unavailable', body['errors'].first['code']
  end

  test 'reset stops, ID review and reset verification touch the legacy columns' do
    sign_in users(:community_admin)
    @upcoming.update_columns(stops_list: [tour_stops(:unit_stop).id])
    post "#{base}/#{@ann.id}/reset_stops.json", as: :json
    assert_response :success
    assert_equal [], @upcoming.reload.stops_list
    put "#{base}/#{@ann.id}/id_review.json", as: :json, params: { mismatch: true }
    assert_response :success
    assert @ann.reload.id_selfie_mismatch
    assert_equal 'mismatch', body['data']['profile']['visitor']['id_check']['state']
    @ann.update_columns(is_checkpoint_verified: true, checkpoint_verified_at: Time.current)
    @tour.update_columns(verification_type: 'check_point_id')
    put "#{base}/#{@ann.id}/reset_verification.json", as: :json
    assert_response :success
    assert_equal false, @ann.reload.is_checkpoint_verified
  end

  test 'privacy actions need a super admin and run the legacy statements' do
    sign_in users(:community_admin)
    put "#{base}/#{@bob.id}/remove_pii.json", as: :json, params: { fields: %w[email] }
    assert_response :forbidden
    sign_in users(:super_admin)
    put "#{base}/#{@bob.id}/remove_pii.json", as: :json, params: { fields: %w[email phone history] }
    assert_response :success
    @bob.reload
    assert_equal ['Removed at Consumer Request', 'Removed at Consumer Request'], [@bob.email, @bob.phone_number]
    assert @visit.reload.history
    delete "#{base}/#{@ann.id}.json", as: :json
    assert_response :success
    assert_equal 0, SchedualTour.where(tour_user_id: @ann.id).count
  end

  test 'writes are refused when the kill switch is off' do
    sign_in users(:super_admin)
    ENV['PYN_CONNECT_WRITES'] = 'off'
    delete "#{base}/bookings/#{@upcoming.id}.json", as: :json
    assert_response :not_found
    assert SchedualTour.exists?(@upcoming.id)
  ensure
    ENV.delete('PYN_CONNECT_WRITES')
  end
end
