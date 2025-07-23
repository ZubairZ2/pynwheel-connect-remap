# app/workers/fix_missing_community_users_worker.rb
class FixMissingCommunityUsersWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'general', retry: 3

  def perform
    Community.find_each do |community|
      CommunityUserAssignmentService.new(community).assign_admin_users
    end
  end
end
