require 'test_helper'
require_relative '../../support/tour_api_test_helper'

# Two bookings racing for the last place in a slot (October 23, 2026): the
# capacity count runs inside the transaction under a per-property advisory
# lock, so exactly one wins. Runs outside the test transaction (two threads,
# two connections) and cleans up after itself.
class Bookings::CreateConcurrencyTest < ActiveSupport::TestCase
  include TourApiJobsStub

  self.use_transactional_tests = false

  setup do
    fake_jobs!
    @community = communities(:tour_property)
    @tour = tours(:main_tour)
    # Outside the test transaction every change to a fixture row outlives
    # this test: the columns touched are restored and the rows made are
    # deleted in teardown, so the rest of the suite sees the fixtures as they are.
    @community_before = @community.attributes.slice('time_zone', 'scheduler_widget', 'email', 'alert_contact')
    @tour_before = @tour.attributes.slice('max_self_tour_users', 'grace_period')
    @community.update_columns(time_zone: 'America/Chicago', scheduler_widget: true, email: nil, alert_contact: 2)
    @setting = TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: false, time_intervel: '30 min', do_limit_max_tour: true, limit_max_tour: 5)
    @tour.update_columns(max_self_tour_users: 1, grace_period: 15)
    @hour = OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '09:00', closing_time: '12:00', sort: 1)
    @monday = Date.today.next_occurring(:monday)
    @visitors = 2.times.map { |i| TourUser.create!(first_name: "Racer#{i}", last_name: 'Test', name: "Racer#{i} Test", email: "racer#{i}@example.test", phone_number: "+1303555020#{i}") }
  end

  teardown do
    @setting&.delete
    @community.update_columns(@community_before) if @community_before
    @tour.update_columns(@tour_before) if @tour_before
    SchedualTour.where(tour_user_id: @visitors.map(&:id)).delete_all
    PaperTrail::Version.where(item_type: 'SchedualTour', community_id: @community.id).where('created_at > ?', 5.minutes.ago).delete_all
    TourUser.where(id: @visitors.map(&:id)).delete_all
    @hour.delete
    restore_jobs!
  end

  test 'only one of two simultaneous bookings takes the last place in a slot' do
    results = Array.new(2)
    barrier = Queue.new
    threads = @visitors.each_with_index.map do |visitor, i|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          barrier.pop
          results[i] = begin
            Bookings::Create.call!(@community, { tour_type: 'self_tour', tour_date: @monday.iso8601, tour_time: '09:30' }, visitor: visitor, created_by: 'Tour App')
            :booked
          rescue Connect::DomainError => e
            e.code
          end
        end
      end
    end
    2.times { barrier << true }
    threads.each(&:join)
    assert_equal %w[booked slot_full], results.map(&:to_s).sort, results.inspect
    assert_equal 1, SchedualTour.where(community_id: @community.id, tour_date: @monday, tour_user_id: @visitors.map(&:id)).count
  end
end
