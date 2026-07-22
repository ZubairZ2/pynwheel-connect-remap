class SvgCacheWarmAllWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'critical', retry: 1

  # Refreshes SVG caches for all communities that have enable_sdk_map_cache
  # and enable_svg_mode both enabled. Called by Heroku Scheduler every 10 min.
  # Only these communities have SVG caching active — no guesswork, no markers.
  def perform
    community_ids = Community
      .active_client_properties
      .where(enable_sdk_map_cache: true, enable_svg_mode: true)
      .pluck(:id)

    # community_ids.each { |id| SvgCacheWarmingWorker.perform_async(id, true) }

    Rails.logger.info "[SvgCacheWarmAllWorker] Enqueued #{community_ids.size} warming jobs"
  rescue Redis::BaseError, Errno::ECONNREFUSED => e
    Rails.logger.warn "[SvgCacheWarmAllWorker] Redis error: #{e.message} — skipping"
  end
end
