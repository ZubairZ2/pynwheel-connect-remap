require 'test_helper'

class TourApi::EngineTest < ActiveSupport::TestCase
  setup do
    @community = communities(:tour_property)
    TourApi::Engine.clear!
  end

  teardown { TourApi::Engine.clear! }

  # Minitest's stub replaces the class method itself, so the real constructor is kept aside.
  def original_new
    @original_new ||= Wayfinding::GraphBuilder.method(:new)
  end

  test 'the graph is built once per version and remembered' do
    builds = 0
    original = original_new
    counting = lambda do |*args, **opts|
      builds += 1
      original.call(*args, **opts)
    end
    first = nil
    second = nil
    Wayfinding::GraphBuilder.stub(:new, counting) do
      first = TourApi::Engine.built(@community)
      second = TourApi::Engine.built(@community)
    end
    assert_same first, second
    assert_equal 1, builds
    assert_equal TourApi::Engine.version(@community), first.version
    assert first.graph.nodes.any?
  end

  test 'concurrent cold requests share one build' do
    count = Mutex.new
    built = 0
    original = original_new
    slow = lambda do |*args, **opts|
      count.synchronize { built += 1 }
      sleep 0.2 # the build takes a while, as it does on a large property
      original.call(*args, **opts)
    end
    version = TourApi::Engine.version(@community)
    results = nil
    Wayfinding::GraphBuilder.stub(:new, slow) do
      results = 4.times.map { Thread.new { TourApi::Engine.built(@community, version: version) } }.map(&:value)
    end
    assert_equal 1, built, 'four parallel requests for a cold graph must build it once'
    assert results.all? { |r| r.equal?(results.first) }
  end

  test 'a different version or option builds again and drops the older version' do
    version = TourApi::Engine.version(@community)
    a = TourApi::Engine.built(@community, version: version)
    b = TourApi::Engine.built(@community, version: version, step_free: true)
    assert_not_same a, b
    c = TourApi::Engine.built(@community, version: 'wf-moved')
    assert_equal 'wf-moved', c.version
    again = TourApi::Engine.built(@community, version: version)
    assert_not_same a, again, 'the older version was dropped when the new one was built'
  end

  test 'the payload is remembered per base URL on the built graph' do
    built = TourApi::Engine.built(@community)
    payload = TourApi::Engine.payload(built, 'http://a.test')
    assert_same payload, TourApi::Engine.payload(built, 'http://a.test')
    assert_not_same payload, TourApi::Engine.payload(built, 'http://b.test')
    assert_equal built.version, payload[:version]
  end
end
