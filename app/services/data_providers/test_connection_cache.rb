module DataProviders
  # Shared state for the three "Test ..." buttons on the settings page.
  #
  # Those buttons used to run the provider round trip inline, which on a large
  # property blew past Heroku's fixed 30s router timeout and handed the admin an
  # "Application error" page instead of data. The work now happens in
  # TestConnectionWorker and lands here; the request only ever reads.
  #
  # This deliberately goes through Sidekiq's Redis rather than Rails.cache:
  # development runs Rails.cache as a per-process :memory_store, so the worker's
  # result would never be visible to the web process and the page would poll
  # forever. Sidekiq's connection is shared by both by definition.
  module TestConnectionCache
    KINDS = %w[connection pricing space_configuration].freeze

    # Long enough to survive the poll reloads and a reopened tab. Each click of
    # the button itself passes refresh=1, so this never hides a fresh test.
    RESULT_TTL = 10.minutes

    # Failures expire fast: the admin's next move is to correct the credentials
    # and try again, and they should not have to out-wait a cached error.
    ERROR_TTL = 1.minute

    # A claim older than this is treated as a dead job — a Sidekiq restart mid
    # fetch would otherwise wedge the button until the key expired on its own.
    #
    # This has to outlast the whole queue wait plus the fetch, not just the fetch.
    # At 3 minutes it expired while the job was still sitting in the queue, so the
    # polling page re-claimed and enqueued a duplicate every 3 minutes — one stuck
    # test quietly turned into four, all of them behind each other. An explicit
    # click (refresh=1) clears this key outright via .clear, so a genuinely dead
    # job is one button press away and does not need a short TTL to recover.
    PENDING_TTL = 15.minutes

    module_function

    def read(community_id, kind)
      raw = redis { |conn| conn.get(result_key(community_id, kind)) }
      return nil if raw.nil?

      payload = JSON.parse(inflate(raw), symbolize_names: true)
      payload[:xml] = payload[:xml].to_s if payload[:xml]
      payload
    rescue StandardError => e
      Rails.logger.error("[TestConnectionCache] unreadable result for #{community_id}/#{kind}: #{e.class}: #{e.message}")
      nil
    end

    def write(community_id, kind, xml: nil, error: nil)
      body = deflate({ xml: xml, error: error, generated_at: Time.current.iso8601 }.to_json)
      ttl  = error.present? ? ERROR_TTL : RESULT_TTL

      redis { |conn| conn.set(result_key(community_id, kind), body, ex: ttl.to_i) }
    ensure
      release(community_id, kind)
    end

    # Called for refresh=1, i.e. the admin actually clicked the button. That is an
    # explicit "do it again now", so it drops the claim as well as the result — it
    # is the escape hatch for a claim whose job died, and it is why PENDING_TTL can
    # afford to be long. Polling reloads never reach here; they drop refresh.
    def clear(community_id, kind)
      redis { |conn| conn.del(result_key(community_id, kind), pending_key(community_id, kind)) }
    end

    # SET NX, so two admins hammering the button enqueue one fetch rather than
    # two. Truthy only for the caller that actually won the claim.
    def claim(community_id, kind)
      redis { |conn| conn.set(pending_key(community_id, kind), Time.current.to_i, nx: true, ex: PENDING_TTL.to_i) }
    end

    def release(community_id, kind)
      redis { |conn| conn.del(pending_key(community_id, kind)) }
    end

    def result_key(community_id, kind)
      "provider_test:#{kind}:#{community_id}:result"
    end

    def pending_key(community_id, kind)
      "provider_test:#{kind}:#{community_id}:pending"
    end

    def redis(&block)
      Sidekiq.redis(&block)
    end

    # A few megabytes of repetitive XML compresses to a fraction of that, which
    # keeps both the Redis memory and the round trip small. Base64 on top so the
    # value stays plain ASCII and no encoding conversion anywhere in redis-rb can
    # touch the gzip bytes.
    def deflate(string)
      Base64.strict_encode64(Zlib::Deflate.deflate(string))
    end

    def inflate(raw)
      Zlib::Inflate.inflate(Base64.strict_decode64(raw))
    end
  end
end
