require 'test_helper'

# The server's verdict on a phone fix (October 28, 2026): only `verified`
# proves presence, and nothing missing or unmeasurable ever does.
class Visits::RulesTest < ActiveSupport::TestCase
  DENVER = Community.new(latitude: BigDecimal('39.7392'), longitude: BigDecimal('-104.9903'))

  def verdict(lat, lng, accuracy = nil)
    Visits::Rules.proximity(DENVER, lat, lng, accuracy)
  end

  test 'a fine fix is judged by its centre against the 1 km radius' do
    state, distance = verdict(39.7419, -104.9903, 20)
    assert_equal 'verified', state
    assert_in_delta 300, distance, 20
    state, distance = verdict(39.7662, -104.9903, 20)
    assert_equal 'outside', state
    assert_in_delta 3000, distance, 50
    assert_equal 'verified', verdict(39.7419, -104.9903).first, 'no accuracy reported: the centre decides, as before'
  end

  test 'the error circle settles a coarse fix when it can, else the fix verifies nothing' do
    assert_equal 'verified', verdict(39.7419, -104.9903, 400).first, '300 m away with a 400 m circle still lies inside 1 km'
    assert_equal 'outside', verdict(39.9192, -104.9903, 5000).first, '20 km away with a 5 km circle still lies outside'
    state, distance = verdict(39.7464, -104.9903, 400)
    assert_equal 'unverified_poor_accuracy', state
    assert_in_delta 800, distance, 20
    assert_equal 'unverified_poor_accuracy', verdict(39.7392, -104.9903, 1200).first, 'at the property but a 1.2 km circle proves nothing'
  end

  test 'missing phone or property coordinates are unverified, never presence' do
    assert_equal ['unverified_no_fix', nil], verdict(nil, nil)
    assert_equal ['unverified_no_fix', nil], verdict(39.7392, nil, 10)
    nowhere = Community.new(latitude: nil, longitude: nil)
    assert_equal ['unverified_no_property_coords', nil], Visits::Rules.proximity(nowhere, 39.7392, -104.9903, 10)
    assert_equal ['unverified_no_property_coords', nil], Visits::Rules.proximity(Community.new(latitude: BigDecimal('39.7'), longitude: nil), 39.7392, -104.9903, 10)
  end

  test 'the states the API may answer are exactly these' do
    assert_equal %w[verified outside unverified_no_fix unverified_poor_accuracy unverified_no_property_coords], Visits::Rules::PROXIMITY_STATES
    assert_equal 150, Visits::Rules::ACCURACY_GATE_M
  end
end
