namespace :community_time_zone do
  desc 'update communities time zone'
  task :update_time_zone => :environment do

    Community.where(time_zone: "UTC").each do |community|
      begin
        
        if community.latitude.present? && community.longitude.present?
          time_zone = Timezone.lookup(community.latitude, community.longitude)&.name
          community.update_column :time_zone, time_zone  if time_zone.present?
        end
        
      rescue
        next
      end
    end
  end
end