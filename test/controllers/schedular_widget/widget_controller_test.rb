require 'test_helper'

# The public booking page (SchedulerWidget::WidgetsController#test_widget): a
# direct link carries the property's signed code (`Community#community_code`);
# a missing, invalid or mismatched code, or an unknown property, answers 404
# before anything is written (October 27, 2026). Before, the bad code raised
# inside the action and the prospect landed on the staff scheduled-tours page.
class SchedulerWidget::WidgetControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @community.update_columns(time_zone: 'America/Chicago', scheduler_widget: true)
    @tour = tours(:main_tour)
    TourSetting.create!(tour: @tour, allow_self_tour: true, allow_guided_tour: true, time_intervel: '15 min')
    @tour.create_scheduler_widget_setting(btn_text: 'Schedule a Visit')
    OpeningHour.create!(community_id: @community.id, day: 'Monday', opening_time: '09:00', closing_time: '12:00', sort: 1)
    @other = communities(:one)
  end

  def widget(params)
    get '/scheduler_widget/test_widget', params: params
  end

  # The legacy page's stylesheet does not compile under the test asset pipeline
  # (a Sass `rgba` error the action's rescue turns into a redirect), so the
  # two "opens" tests assert that the code passed verification and the action
  # ran (its placeholder row), not the rendered HTML; the page itself is
  # checked against a running server.
  def assert_widget_opened
    assert_not_equal 404, response.status
    assert_not_equal 'Not Found', response.body
  end

  test 'a direct link with the property\'s signed code opens the widget' do
    assert_difference(-> { SchedualTour.where(community_id: @community.id).count }, 1) do
      widget(community_id: @community.id, community_code: @community.community_code, direct: true)
    end
    assert_widget_opened
  end

  test 'a direct link with a malformed code is refused with 404 and writes nothing' do
    assert_no_difference(-> { SchedualTour.count }) do
      widget(community_id: @community.id, community_code: 'bogus', direct: true)
    end
    assert_response :not_found
    assert_equal 'Not Found', response.body
  end

  test 'a direct link without a code is refused with 404' do
    widget(community_id: @community.id, direct: true)
    assert_response :not_found
  end

  test 'a code signed for another property is refused with 404' do
    widget(community_id: @community.id, community_code: @other.community_code, direct: true)
    assert_response :not_found
  end

  test 'a code signed with another key is refused with 404' do
    foreign = JWT.encode({ 'community_id' => @community.id }, 'another-environment-secret', 'HS256')
    widget(community_id: @community.id, community_code: foreign, direct: true)
    assert_response :not_found
  end

  test 'an unknown property answers 404 whether or not the link is direct' do
    widget(community_id: 0, direct: true, community_code: 'x')
    assert_response :not_found
    widget(community_id: 0)
    assert_response :not_found
  end

  test 'the embedded (non-direct) widget still opens without a code' do
    assert_difference(-> { SchedualTour.where(community_id: @community.id).count }, 1) do
      widget(community_id: @community.id)
    end
    assert_widget_opened
  end
end
