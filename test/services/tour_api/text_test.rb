require 'test_helper'

class TourApi::TextTest < ActiveSupport::TestCase
  test 'strip_html gives plain text' do
    assert_equal 'Floor 1 & 2 done', TourApi::Text.strip_html('Floor 1 &amp; <b>2</b><br/>done')
    assert_equal 'Past the mailroom.', TourApi::Text.strip_html('Past the mailroom.<font color="red"><br></font>')
    assert_equal 'lobby on each floor. Follow the path', TourApi::Text.strip_html('lobby on each floor.&nbsp; Follow the path')
    assert_nil TourApi::Text.strip_html(nil)
    assert_nil TourApi::Text.strip_html('<p></p>')
    assert_equal 'a < b', TourApi::Text.strip_html('a < b')
  end

  test 'to_f reads the leading number as the contract did' do
    assert_equal 2.0, TourApi::Text.to_f('2')
    assert_equal 2.5, TourApi::Text.to_f(' 2.5 baths')
    assert_equal 0.0, TourApi::Text.to_f('Studio')
    assert_equal 0.0, TourApi::Text.to_f(nil)
    assert_equal 850.0, TourApi::Text.to_f(850)
  end

  test 'truthiness, rounding and delimiters' do
    assert TourApi::Text.truthy?(1.5)
    assert_not TourApi::Text.truthy?(0.0)
    assert_not TourApi::Text.truthy?('')
    assert_not TourApi::Text.truthy?(nil)
    assert_equal '1,032', TourApi::Text.delimited(1032)
    assert_equal '53', TourApi::Text.delimited(53)
    assert_equal 2, TourApi::Text.round_half_even(2.5)
    assert_equal 4, TourApi::Text.round_half_even(3.5)
    assert_equal 1077, TourApi::Text.round_half_even(1077.3)
  end

  test 'names and places as the steps phrase them' do
    graph = Wayfinding::GraphBuilder.new(communities(:tour_property)).build
    assert_equal 'Tour start', TourApi::Text.name_of(nil, 'tour_start:1')
    assert_equal 'Main Tour', TourApi::Text.name_of(graph.nodes["tour_start:#{tours(:main_tour).id}"])
    assert_equal 'Floor 3', TourApi::Text.place_name(graph, "floorplate:#{floorplates(:plate_a).id}", 3)
    assert_equal 'Tower A', TourApi::Text.place_name(graph, "floorplate:#{floorplates(:plate_a).id}", nil)
    assert_equal 'the floor', TourApi::Text.place_name(graph, nil, nil)
    sitemap = Wayfinding::GraphBuilder.new(communities(:sitemap_property)).build
    assert_equal 'Property map', TourApi::Text.place_name(sitemap, "sitemap:#{sitemaps(:property_map).id}", nil)
  end

  test 'timestamps are UTC ISO 8601 with fractions only when present' do
    assert_equal '2026-10-12T15:26:52Z', TourApi::Text.timestamp(Time.utc(2026, 10, 12, 15, 26, 52))
    assert_equal '2026-10-12T15:26:52.793543Z', TourApi::Text.timestamp(Time.utc(2026, 10, 12, 15, 26, 52, 793_543))
    assert_nil TourApi::Text.timestamp(nil)
  end
end
