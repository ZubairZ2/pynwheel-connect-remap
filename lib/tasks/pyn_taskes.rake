namespace :missing_community_users do
  desc 'Add missing community users'
  task :add  => :environment do
    FixMissingCommunityUsersWorker.perform_async
  end
end