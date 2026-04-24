class FetchDataRefreshWorker
  include Sidekiq::Worker
  sidekiq_options queue: :critical, retry: 0

  COMMUNITY_INCLUDES = [
    :sitemap, :floorplates, :floorplans, :map_filter,
    :font_setting, :credential, :calculator_config, :three_d_maps_configuration
  ].freeze

  def perform(community_id)
    community = Community
      .where(id: community_id, enable_sdk_map_cache: true)
      .includes(*COMMUNITY_INCLUDES)
      .first
    return unless community

    builder = SdkPayloadBuilderService.new(community)

    %w[marketing ops].each do |map_type|
      payload = builder.build(ops_map: map_type == 'ops')
      Rails.cache.write(
        SdkCacheService.fetch_data_key(community_id, map_type),
        payload,
        expires_in: SdkCacheService::FETCH_DATA_TTL,
        compress:   true
      )
    end
  rescue Redis::BaseError, Errno::ECONNREFUSED => e
    Rails.logger.warn "[FetchDataRefreshWorker] Redis error for community #{community_id}: #{e.message}"
  rescue StandardError => e
    Rails.logger.error "[FetchDataRefreshWorker] Error for community #{community_id}: #{e.message}"
  end
end
