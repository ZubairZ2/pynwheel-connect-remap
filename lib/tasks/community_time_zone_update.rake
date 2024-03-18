namespace :community_time_zone do
  desc 'update communities time zone'
  task :update_time_zone => :environment do

    Community.active_client_properties.each do |community|      
      begin
        TimeZoneUpdateWorker.perform_async(community.id)
      rescue
        next
      end
    end
  end
end