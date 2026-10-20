require 'test_helper'

# The legacy scheduler widget's submit (SchedualToursController#create_tour_user_from)
# checks the picked slot on the server since October 20, 2026: the same
# Bookings::Availability rules Connect and the Tour app use. A slot that is
# closed, full or outside the hours sends the visitor back to the widget
# with a message and creates nothing; an open slot books as before.
class SchedualToursSlotCheckTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @community.update_columns(time_zone: 'America/Chicago', scheduler_widget: true)
    @tour = tours(:main_tour)
    @setting = TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: false, time_intervel: '30 min', do_limit_max_tour: true, limit_max_tour: 5)
    @tour.update_columns(max_self_tour_users: 1, credit_card_required: false)
    OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '09:00', closing_time: '12:00', sort: 1)
    @monday = Date.today.next_occurring(:monday)
  end

  def placeholder(time)
    SchedualTour.create!(community_id: @community.id, tour_date: @monday, tour_time: time, end_time: time, property_tour_type: 'scheduled_tour')
  end

  # The legacy flow enqueues its mails on Sucker Punch; the job would run after the
  # test transaction on a closed connection, so the enqueue is stubbed here.
  def submit(placeholder_row, email: 'widget@example.test', phone: '3035550177')
    ScheduledTourMailerJob.stub(:perform_async, nil) { post_submit(placeholder_row, email: email, phone: phone) }
  end

  def post_submit(placeholder_row, email:, phone:)
    post '/create_tour_user_from', params: {
      community_id: @community.id, sched_tour_id: placeholder_row.id, tour_type: 'self_tour', user_time_zone: 'America/Chicago', country_code: 'US',
      tour_date: @monday.strftime('%m/%d/%Y'), tour_time: placeholder_row.tour_time.strftime('%I:%M %p'),
      tour_user: { first_name: 'Widget', last_name: 'Visitor', email: email, phone_number: phone, property_tour_type: 'scheduled_tour', is_sms_enabled: '0' }
    }
  end

  test 'a closed time is refused before anything is written' do
    row = placeholder('14:00')
    assert_no_difference(-> { TourUser.count }) do
      submit(row)
    end
    assert_response :redirect
    assert_includes response.location, '/scheduler_widget/test_widget'
    assert_includes CGI.unescape(response.location), 'That time is no longer available.'
    assert_nil row.reload.tour_user_id
  end

  test 'a full slot is refused' do
    first = TourUser.create!(first_name: 'A', last_name: 'B', email: 'a@example.test', phone_number: '+13035550101')
    SchedualTour.create!(community_id: @community.id, tour_user_id: first.id, tour_date: @monday, tour_time: '10:00', tour_type: 'self_tour', property_tour_type: 'scheduled_tour')
    row = placeholder('10:00')
    submit(row)
    assert_response :redirect
    assert_includes CGI.unescape(response.location), 'That time is full for App Guided Tour.'
    assert_nil row.reload.tour_user_id
  end

  test 'a closure and the minimum notice are refused too' do
    TourClosure.create!(community_id: @community.id, date: @monday, closed_all_day: true, label: 'Holiday')
    row = placeholder('10:00')
    submit(row)
    assert_response :redirect
    assert_includes CGI.unescape(response.location), 'no longer available'
    TourClosure.delete_all
    @setting.update_columns(minimum_notice_minutes: 1440)
    travel_to Time.find_zone('America/Chicago').local(@monday.year, @monday.month, @monday.day, 8, 0) do
      submit(placeholder('10:00'))
      assert_response :redirect
      assert_includes CGI.unescape(response.location), 'no longer available'
    end
  end

  test 'an open slot still books through the legacy flow' do
    row = placeholder('10:30')
    assert_difference(-> { TourUser.count }, 1) do
      submit(row)
    end
    assert_response :redirect
    refute_includes CGI.unescape(response.location), 'no longer available'
    booking = SchedualTour.where(community_id: @community.id).where.not(tour_user_id: nil).last
    assert_equal ['self_tour', 'scheduled_tour', @monday, '10:30', 'Pynwheel'], [booking.tour_type, booking.property_tour_type, booking.tour_date, booking.tour_time.strftime('%H:%M'), booking.created_by]
  end

  test 'an unscheduled visit is not checked' do
    row = SchedualTour.create!(community_id: @community.id, property_tour_type: 'unscheduled_self_tour')
    ScheduledTourMailerJob.stub(:perform_async, nil) do
      post '/create_tour_user_from', params: { community_id: @community.id, sched_tour_id: row.id, tour_type: 'self_tour', country_code: 'US',
                                               tour_user: { first_name: 'Walk', last_name: 'In', email: 'walk@example.test', phone_number: '3035550188', property_tour_type: 'unscheduled_self_tour', is_sms_enabled: '0' } }
    end
    assert_response :redirect
    refute_includes CGI.unescape(response.location), 'no longer available'
  end

  test 'the staff list asks for a sign-in instead of raising for an anonymous visitor' do
    get "/communities/#{@community.id}/scheduled_tours"
    assert_response :redirect
    assert_includes response.location, 'sign_in'
  end

  test 'the slot lookup stays public for the widget' do
    get '/schedual_tours/get_tour_type', params: { day: 'Monday', time: '09:30 am', date: @monday.strftime('%m/%d/%Y'), community_id: @community.id }, xhr: true
    assert_response :success
    assert JSON.parse(response.body).key?('tour_types'), 'the widget still gets its answer without a session'
  end
end
