class SdkCacheService
  FETCH_DATA_TTL = 15.minutes

  # ── Key helpers ──────────────────────────────────────────────────────────

  def self.fetch_data_key(community_id, map_type)
    "pyn_sdk_v1_#{community_id}_#{map_type}"
  end

  # ── Read-through cache (sdk_controller#fetch_data) ───────────────────────
  #
  # HIT  → returns cached payload, block never called.
  # MISS → calls block, stores result, returns it.
  # Redis error → calls block and returns directly — never crashes.
  #
  # NOTE: Favorites are per-session and merged at serve time. A Favorite
  # change never needs to invalidate this cache.
  def self.fetch_data(community_id, map_type, &block)
    Rails.cache.fetch(
      fetch_data_key(community_id, map_type),
      expires_in: FETCH_DATA_TTL,
      compress:   true,
      &block
    )
  rescue Redis::BaseError, Errno::ECONNREFUSED
    yield
  end

  # ── Refresh (write-through) ───────────────────────────────────────────────

  # Enqueues a background job to rebuild and overwrite fetch_data for both map
  # types. Old cached data stays live until the job completes — no cold window.
  # No-op if enable_sdk_map_cache is off. Called on unit, floorplan, amenity,
  # community changes.
  def self.invalidate_fetch_data(community_id)
    return unless community_id
    return unless Community.where(id: community_id, enable_sdk_map_cache: true).exists?
    delete_fetch_data_keys(community_id)
    FetchDataRefreshWorker.perform_async(community_id)
  rescue Redis::BaseError, Errno::ECONNREFUSED
    nil
  end

  # Refreshes fetch_data and SVG caches with new data.
  # No-op if enable_sdk_map_cache is off.
  # One DB query reads both enable_sdk_map_cache and enable_svg_mode together.
  # Called on floorplate and sitemap changes.
  def self.invalidate_map(community_id, map_id, map_type)
    return unless community_id
    svg_mode = Community
      .where(id: community_id, enable_sdk_map_cache: true)
      .pick(:enable_svg_mode)
    return if svg_mode.nil?  # caching off or community not found

    delete_fetch_data_keys(community_id)
    SvgCacheService.delete(map_id, map_type)  # always delete — fetch_svg_image caches whenever enable_sdk_map_cache is on
    SvgCacheWarmingWorker.perform_async(community_id, true) if svg_mode
    FetchDataRefreshWorker.perform_async(community_id)
  rescue StandardError
    nil
  end

  def self.delete_fetch_data_keys(community_id)
    Rails.cache.delete(fetch_data_key(community_id, 'marketing'))
    Rails.cache.delete(fetch_data_key(community_id, 'ops'))
  rescue Redis::BaseError, Errno::ECONNREFUSED
    nil
  end
end
