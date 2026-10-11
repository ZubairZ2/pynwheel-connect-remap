require 'test_helper'

# The Connect units listing (`GET /communities/:id/units.json`), paged: the
# `ids` filter Unit Detail reads its one unit with (October 11, 2026).
class UnitsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @unit = units(:plotted_unit)
    sign_in users(:super_admin)
  end

  def listing(query)
    get "/communities/#{@community.id}/units.json?#{query}"
    assert_response :success
    JSON.parse(response.body)
  end

  test 'a page of one unit by id answers that unit alone, with its paging meta' do
    body = listing("page=1&per_page=1&ids=#{@unit.id}")
    assert_equal [@unit.id], body['data'].map { |row| row['id'] }
    assert_equal 1, body['meta']['pagination']['total_count']
    assert_equal 1, body['meta']['total_count']
    assert_equal @unit.marketing_name, body['data'].first['marketing_name']
  end

  test 'ids stays inside the property: another property\'s unit is not found' do
    other = units(:no_tour_unit)
    assert_not_equal @community.id, other.community_id
    body = listing("page=1&per_page=1&ids=#{other.id}")
    assert_equal [], body['data']
    assert_equal 0, body['meta']['pagination']['total_count']
  end

  test 'without ids the page is the listing as before' do
    all = listing('page=1&per_page=100')
    assert_operator all['data'].size, :>, 1
    assert_includes all['data'].map { |row| row['id'] }, @unit.id
    # A non-numeric id is ignored rather than raising.
    assert_equal all['data'].size, listing('page=1&per_page=100&ids=abc')['data'].size
  end
end
