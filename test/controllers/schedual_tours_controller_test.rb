require 'test_helper'

class SchedualToursControllerTest < ActionDispatch::IntegrationTest
  setup do
    @schedual_tour = schedual_tours(:one)
  end

  test "should get index" do
    get schedual_tours_url
    assert_response :success
  end

  test "should get new" do
    get new_schedual_tour_url
    assert_response :success
  end

  test "should create schedual_tour" do
    assert_difference('SchedualTour.count') do
      post schedual_tours_url, params: { schedual_tour: { tour_date: @schedual_tour.tour_date, tour_id: @schedual_tour.tour_id, tour_time: @schedual_tour.tour_time, tour_user_id: @schedual_tour.tour_user_id } }
    end

    assert_redirected_to schedual_tour_url(SchedualTour.last)
  end

  test "should show schedual_tour" do
    get schedual_tour_url(@schedual_tour)
    assert_response :success
  end

  test "should get edit" do
    get edit_schedual_tour_url(@schedual_tour)
    assert_response :success
  end

  test "should update schedual_tour" do
    patch schedual_tour_url(@schedual_tour), params: { schedual_tour: { tour_date: @schedual_tour.tour_date, tour_id: @schedual_tour.tour_id, tour_time: @schedual_tour.tour_time, tour_user_id: @schedual_tour.tour_user_id } }
    assert_redirected_to schedual_tour_url(@schedual_tour)
  end

  test "should destroy schedual_tour" do
    assert_difference('SchedualTour.count', -1) do
      delete schedual_tour_url(@schedual_tour)
    end

    assert_redirected_to schedual_tours_url
  end
end
