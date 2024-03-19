namespace :community_time_zone do
  desc 'update communities time zone'
  task :update_time_zone => :environment do

    Community.active_client_properties.where(time_zone: "UTC").each do |community|      
      begin
        community.set_community_time_zone()
      rescue
        next
      end
    end
  end
end