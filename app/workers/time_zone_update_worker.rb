class TimeZoneUpdateWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'timezone', retry: 3

  def perform(community_id)
    community = Community.find_by_id community_id
    return unless community.present?
    community.set_community_time_zone()
  end
  
end