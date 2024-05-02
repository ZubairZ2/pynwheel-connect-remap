namespace :community_country_code do
  desc 'update communities time zone'
  task :update_country_code => :environment do
    Community.active_client_properties.each do |community|      
      begin
        TimeZoneUpdateWorker.perform_async community.id if community.country_code.nil?
      rescue
        next
      end
    end
  end
end