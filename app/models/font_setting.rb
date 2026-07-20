# app/models/font_setting.rb
class FontSetting < ApplicationRecord
  belongs_to :community

  after_commit :invalidate_sdk_cache

  private

  def invalidate_sdk_cache
    # SdkCacheService.invalidate_fetch_data(community_id)
  end
end