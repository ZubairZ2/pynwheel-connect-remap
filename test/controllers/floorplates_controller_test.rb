require 'test_helper'

# The Connect floorplates listing (`GET /communities/:id/floorplates.json`):
# the map meta Map & Plotting reads a property's map model from, and the
# per-floorplate counts the strip shows.
class FloorplatesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @community = communities(:tour_property)
    @plate = floorplates(:plate_a)
    sign_in users(:super_admin)
  end

  def listing
    get "/communities/#{@community.id}/floorplates.json"
    assert_response :success
    JSON.parse(response.body)
  end

  test 'the meta says whether the property is a Beans map and carries its shared background' do
    body = listing
    assert_equal false, body['meta']['beans_svg']
    assert_nil body['meta']['shared_background']
    assert_equal 'floorplates', body['meta']['map_type']

    @community.update_columns(is_beans_svg: true, background_svg_image: '1790021768-bg.svg')
    body = listing
    assert_equal true, body['meta']['beans_svg']
    background = body['meta']['shared_background']
    assert_equal '1790021768-bg.svg', background['file_name']
    assert_match %r{/uploads/community/background_svg_image/#{@community.id}/1790021768-bg\.svg\z}, background['url']
  end

  test 'a unit placed on the floor SVG by a map import counts as plotted on the floorplate covering its floor' do
    row = listing['data'].find { |plate| plate['id'] == @plate.id }
    before = row['plotted_unit_count']

    # Beans leaves `floorplate_id` empty and stores the polygon the unit sits on.
    units(:unplotted_unit).update_columns(floor: 1, floorplate_id: nil, x_plot: 0, y_plot: 0,
                                          pointer_data: { 'id' => 'Vector_9', 'tag' => 'polygon', 'x_plot' => '993', 'y_plot' => '710', 'selector' => '' })
    row = listing['data'].find { |plate| plate['id'] == @plate.id }
    assert_equal before, row['plotted_unit_count'], 'without a floor SVG the pointer has nothing to sit on'

    @plate.update_columns(svg_image: '1790024432-Floor_1_noBG.svg')
    row = listing['data'].find { |plate| plate['id'] == @plate.id }
    assert_equal before + 1, row['plotted_unit_count']
    assert_equal '1790024432-Floor_1_noBG.svg', row['svg']['file_name']
  end
end
