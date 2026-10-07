# frozen_string_literal: true

module TourApi
  # Builds and remembers a property's wayfinding graph for the Tour App API.
  #
  # The graph is `Wayfinding::GraphBuilder#build`, keyed by (property, graph
  # version, step_free, avoid_blockers). The version (`Wayfinding::GraphVersion`)
  # is recomputed from the database on every request, so a changed stop,
  # path, elevator or tour setup produces a new key and the old graph is
  # simply never used again; entries also expire after a TTL and older
  # versions of a property are dropped when a new one is built. Per process,
  # because a built Graph (ActiveRecord rows, hashes with default procs) is
  # not something Rails.cache can hold. Nothing here writes.
  module Engine
    TTL = 15.minutes
    MAX_ENTRIES = 64

    Built = Struct.new(:version, :graph, :built_at, :payloads, :graph_json, keyword_init: true)

    @cache = {}
    @mutex = Mutex.new
    @building = {}
    @built_cv = ConditionVariable.new

    module_function

    def version(community)
      Wayfinding::GraphVersion.for(community)
    end

    # One build per key, however many requests arrive at once: the app opens a
    # property with four parallel requests (detail, graph, stops, map) and then
    # asks for the distances, and each used to build its own copy of the same
    # graph on a cold cache (one build per Puma thread, all stalling together).
    # The first request builds; the others wait for its result.
    def built(community, step_free: false, avoid_blockers: true, version: nil)
      version ||= version(community)
      key = [community.id, version, step_free ? true : false, avoid_blockers ? true : false]
      loop do
        now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        hit = nil
        waited = false
        @mutex.synchronize do
          entry = @cache[key]
          if entry && now - entry.built_at < TTL
            hit = entry
          elsif @building[key]
            @built_cv.wait(@mutex) # another request is building this graph; re-check when it is done
            waited = true
          else
            @building[key] = true
          end
        end
        return hit if hit
        break unless waited
      end
      begin
        graph = Wayfinding::GraphBuilder.new(community, step_free: step_free, avoid_blockers: avoid_blockers).build
        entry = Built.new(version: version, graph: graph, built_at: Process.clock_gettime(Process::CLOCK_MONOTONIC), payloads: {}, graph_json: {})
        @mutex.synchronize do
          @cache.delete_if { |k, _| k[0] == community.id && k[1] != version }
          @cache[key] = entry
          @cache.shift while @cache.size > MAX_ENTRIES
        end
        entry
      ensure
        @mutex.synchronize do
          @building.delete(key)
          @built_cv.broadcast
        end
      end
    end

    # The Tour App payload of `Wayfinding::GraphSerializer` (the shape the
    # legacy `api/self_tour/v1/.../wayfinding` serves), remembered on the
    # built graph per base URL (image URLs depend on it).
    def payload(built, base_url)
      built.payloads[base_url] ||= Wayfinding::GraphSerializer.new(built.graph, version: built.version, base_url: base_url).as_json
    end

    def clear!
      @mutex.synchronize do
        @cache.clear
        @building.clear
      end
    end
  end
end
