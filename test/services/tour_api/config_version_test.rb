require 'test_helper'

# The configuration version the Tour App compares on resume (October 25, 2026).
class TourApi::ConfigVersionTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    @tour = tours(:main_tour)
  end

  test 'is stable while nothing changes and moves with the graph, the rules, the hours and the gates' do
    v0 = TourApi::ConfigVersion.for(@community)
    assert_equal v0, TourApi::ConfigVersion.for(@community)
    assert_match(/\Acfg-#{@community.id}-[0-9a-f]{16}\z/, v0)

    @tour.update!(grace_period: 33)
    v1 = TourApi::ConfigVersion.for(@community)
    assert_not_equal v0, v1, 'a booking rule on the tour'

    TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: true, time_intervel: '30 min')
    v2 = TourApi::ConfigVersion.for(@community)
    assert_not_equal v1, v2, 'the tour settings'

    OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '09:00', closing_time: '12:00', sort: 1)
    v3 = TourApi::ConfigVersion.for(@community)
    assert_not_equal v2, v3, 'the visiting hours'

    @community.update_columns(scheduler_widget: false)
    v4 = TourApi::ConfigVersion.for(@community)
    assert_not_equal v3, v4, 'the scheduler gate'

    tour_stops(:unit_stop).update!(sort: 42)
    v5 = TourApi::ConfigVersion.for(@community)
    assert_not_equal v4, v5, 'the stops (through the graph version)'
    assert_equal v5, TourApi::ConfigVersion.for(@community)
  end
end
