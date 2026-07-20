class BedroomMarkerColor < ApplicationRecord
  belongs_to :community
  validates :bedroom, uniqueness: { scope: :community_id }
  after_commit :bust_sdk_cache

  private
  
  def bust_sdk_cache
    # SdkCacheService.invalidate_fetch_data(community_id)
  end
end
