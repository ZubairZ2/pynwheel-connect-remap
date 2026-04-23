class SvgCacheWarmAllWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'critical', retry: 1

  # Enqueues SvgCacheWarmingWorker for every community that is:
  #   - active_client_properties (not locked, not internal company_id 44/783)
  #   - enable_svg_mode: true
  #
  # Called by: rake svg_cache:warm_all (Heroku Scheduler, every 20 min)
  def perform
    community_ids = Community
      .active_client_properties
      .where(enable_svg_mode: true)
      .pluck(:id)

    community_ids.each do |id|
      SvgCacheWarmingWorker.perform_async(id)
    end

    Rails.logger.info "[SvgCacheWarmAllWorker] Enqueued #{community_ids.size} warming jobs"
  end
end
