class SvgCacheWarmAllWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'critical', retry: 1

  # Enqueues SvgCacheWarmingWorker only for communities that have had recent SDK
  # traffic (sdk_active_ marker set by fetch_data within the last 2 hours).
  # This prevents filling Redis with SVGs for all 400+ properties — only the
  # ~20-50 communities with active visitors get warmed at any given time.
  def perform
    all_ids = Community
      .active_client_properties
      .where(enable_svg_mode: true)
      .pluck(:id)

    active_ids = all_ids.select { |id| Rails.cache.exist?("sdk_active_#{id}") }

    active_ids.each { |id| SvgCacheWarmingWorker.perform_async(id, true) }

    Rails.logger.info "[SvgCacheWarmAllWorker] Enqueued #{active_ids.size}/#{all_ids.size} warming jobs (active communities only)"
  rescue Redis::BaseError, Errno::ECONNREFUSED => e
    Rails.logger.warn "[SvgCacheWarmAllWorker] Redis error: #{e.message} — skipping"
  end
end
